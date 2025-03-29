import json
import os
import argparse
import re
from io import TextIOWrapper

DEFAULT_SYSTEM_PROMPT = "You are an expert assistant specialized in analyzing academic paper abstracts and extracting key information accurately and concisely."

OUTPUT_FORMAT_INSTRUCTIONS = """\
Output the result as a single JSON object in this exact format:
{
    "problemStatement": "(string | null) Concise description of the core research problem addressed (1-2 sentences).",
    "methodology": "(string | null) Brief summary of the key method, technique, or approach proposed/used (1-2 short phrases or sentences).",
    "codeLink": "(string | null) URL to the source code repository (e.g., GitHub), if mentioned explicitly in the abstract. Otherwise, null.",
    "benchmark": "(string | null) Name of the specific benchmark dataset or evaluation task used, if mentioned (e.g., "C-MAPSS dataset", "ImageNet"). Otherwise, null.",
    "dataset": "(string | null) Name of the primary dataset(s) used, if mentioned and different from the benchmark (e.g., "NASA turbofan engine degradation simulation data"). Otherwise, null.",
    "results": "(string | null) Key quantitative results or main findings reported (e.g., "cost rate lower than preventive maintenance", "computationally efficient framework using Gaussian processes"). Otherwise, null.",
    "keywords": ["Keyword 1", "Keyword 2", ...] // List of keywords extracted from the abstract, if available, e.g. ["Image Generation", "Depth Estimation", "Text to Speech", "3D Face Animation"]. Otherwise, an empty list.
}

Use null if information for a key cannot be clearly determined from the provided text. Do not add any explanations before or after the JSON object."""

def create_user_prompt(title: str, authors: str | None, abstract: str | None) -> str | None:
    """Formats the user prompt for the LLM."""
    if not abstract:
        return None

    # Clean up potential leading/trailing whitespace in abstract
    clean_abstract = abstract.strip() if abstract else ""
    if not clean_abstract:
        return None

    author_str = authors.strip() if authors else "N/A"

    user_content = f"""\
## Task: Analyze the following academic paper metadata and extract the specified information based SOLELY on the provided Title and Abstract.

## Input Metadata:
Title: {title}
Authors: {author_str}
Abstract: {clean_abstract}

## Extraction Fields and Output Format:
{OUTPUT_FORMAT_INSTRUCTIONS}

## Extracted JSON:"""

    return user_content

def convert_and_split_metadata(
    input_path: str,
    output_prefix: str,
    max_lines: int,
    model_name: str,
    system_prompt: str
):
    total_processed_count = 0
    total_skipped_count = 0
    file_index = 1
    line_count_current_file = 0
    outfile: [TextIOWrapper, None] = None
    current_output_filename = ""

    # Ensure the output directory exists
    output_dir = os.path.dirname(output_prefix)
    if output_dir and not os.path.exists(output_dir):
        try:
            os.makedirs(output_dir)
            print(f"Created output directory: '{output_dir}'")
        except OSError as e:
            print(f"Error creating output directory '{output_dir}'. Details: {e}")
            return

    print(f"Starting processing of '{input_path}'...")
    print(f"Output prefix: '{output_prefix}', Chunk size: {max_lines}")

    try:
        with open(input_path, 'r', encoding='utf-8') as infile:
            # Load the entire JSON array from the input file
            try:
                json_str = infile.read()

                print("Attempting to fix potentially unescaped backslashes within 'abstract' fields...")

                regex_fix_slash_not_quote = re.compile(r'\\(?!")')

                corrected_json_text = regex_fix_slash_not_quote.sub(r'\\\\', json_str)
                del json_str # Free memory

                # Remove control characters and non-UTF-8 characters
                corrected_json_text = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', corrected_json_text)

                # Remove trailing commas
                corrected_json_text = re.sub(r',\s*]', ']', corrected_json_text)

                print("Parsing corrected JSON text...")
                metadata_list = json.loads(corrected_json_text, strict=False)
                del corrected_json_text

                if not isinstance(metadata_list, list):
                    raise ValueError("Input JSON is not a list of objects.")
            except json.JSONDecodeError as e:
                print(f"Error: Invalid JSON file '{input_path}'. Details: {e}")
                return
            except ValueError as e:
                print(f"Error: {e}")
                return

            if not metadata_list:
                print("Input metadata file is empty. No output generated.")
                return

            print(f"Loaded {len(metadata_list)} records from metadata file.")

            # Process each record
            for record in metadata_list:
                # Extract required fields, handle potential missing keys gracefully
                paper_id = record.get('_id')
                title = record.get('title')
                abstract = record.get('abstract')
                authors = record.get('author')

                # Need at least ID, title, and abstract
                if not all([paper_id, title, abstract]):
                    print(f"Warning: Skipping record due to missing essential fields (ID, Title, or Abstract). Record content: {record}")
                    total_skipped_count += 1
                    continue

                # Create the user prompt content
                user_content = create_user_prompt(title, authors, abstract)
                if user_content is None:
                    print(f"Warning: Skipping record ID '{paper_id}' due to empty or missing abstract after cleaning.")
                    total_skipped_count += 1
                    continue

                # Check if a new output file needs to be opened
                if line_count_current_file == 0:
                    # Close the previous file if it's open
                    if outfile and not outfile.closed:
                        print(f"Finished writing {max_lines} lines to '{current_output_filename}'.")
                        outfile.close()

                    current_output_filename = f"{output_prefix}_part_{file_index}.jsonl"
                    print(f"Creating/opening new output file: '{current_output_filename}'...")
                    try:
                        outfile = open(current_output_filename, 'w', encoding='utf-8')
                    except IOError as e:
                        print(f"Error opening output file '{current_output_filename}'. Details: {e}")
                        return # Stop processing

                request_body = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    "temperature": "0.1"
                }

                jsonl_line = {
                    "custom_id": f"extract-{paper_id}",
                    "method": "POST",
                    "url": "/v4/chat/completions",
                    "body": request_body
                }

                try:
                    if outfile is None:
                        raise IOError("Output file is not open.")

                    json.dump(jsonl_line, outfile, ensure_ascii=False)
                    outfile.write('\n')
                except IOError as e:
                    print(f"Error writing to '{current_output_filename}'. Details: {e}")
                    if outfile and not outfile.closed: outfile.close()
                    return # Stop processing

                line_count_current_file += 1
                total_processed_count += 1

                # Check if the current file chunk is full
                if line_count_current_file >= max_lines:
                    file_index += 1
                    line_count_current_file = 0 # Reset counter for the next file
                    # File will be closed at the start of the next iteration or after the loop

                # Progress reporting
                if total_processed_count % 1000 == 0:
                    print(f"Processed {total_processed_count} records...")

    except FileNotFoundError:
        print(f"Error: Input file not found at '{input_path}'")
        if outfile and not outfile.closed: outfile.close() # Clean up if error occurred after opening a file
        return
    except IOError as e:
        print(f"Error reading input file '{input_path}'. Details: {e}")
        if outfile and not outfile.closed: outfile.close()
        return
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        if outfile and not outfile.closed: outfile.close()
        return

    # Close the last opened file if it exists and wasn't closed by reaching max_lines
    if outfile and not outfile.closed:
        print(f"Finished writing {line_count_current_file} lines to '{current_output_filename}'.")
        outfile.close()

    # Final report
    print("-" * 30)
    print(f"Processing finished.")
    if total_processed_count == 0 and total_skipped_count == 0:
         print("Input file was likely empty or contained no valid processable records.")
    else:
        final_file_count = file_index if line_count_current_file == 0 and total_processed_count > 0 else file_index
        print(f"Successfully processed and wrote {total_processed_count} records into {final_file_count} file(s).")
        print(f"Skipped {total_skipped_count} records due to missing data or empty abstracts.")
    print("-" * 30)


def main():
    parser = argparse.ArgumentParser(
        description="Convert metadata JSON to ChatGLM Batch API JSONL format and split into chunks.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    parser.add_argument(
        "--input-json",
        type=str,
        required=True,
        help="Path to the input JSON file containing a list of paper metadata objects."
    )

    parser.add_argument(
        "--output-prefix",
        type=str,
        required=True,
        help="Prefix for the output file names (e.g., 'output_dir/requests'). Files will be named '<prefix>_part_N.jsonl'."
    )

    parser.add_argument(
        "--chunk-size",
        type=int,
        default=50000,
        help="Maximum number of lines (requests) per output file chunk."
    )

    parser.add_argument(
        "--model",
        type=str,
        default="glm-4-flash",
        help="The ChatGLM model name to use in the request body (e.g., glm-4, glm-3-turbo)."
    )

    parser.add_argument(
        "--system-prompt",
        type=str,
        default=DEFAULT_SYSTEM_PROMPT,
        help="The content for the 'system' role message."
    )

    args = parser.parse_args()

    if args.chunk_size <= 0:
        print("Error: Chunk size must be a positive integer.")
    else:
        convert_and_split_metadata(
            args.input_json,
            args.output_prefix,
            args.chunk_size,
            args.model,
            args.system_prompt
        )