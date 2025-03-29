from zhipuai import ZhipuAI
from dotenv import load_dotenv
import os

load_dotenv()

PART_COUNT = 9

def main():
    api_key = os.getenv("ZHIPUAI_API_KEY")
    if api_key is None:
        raise ValueError("Please set the ZHIPUAI_API_KEY environment variable.")

    client = ZhipuAI(api_key=api_key)
    for i in range(1, PART_COUNT + 1):
        file_name = f"pdfs/batch_jsonl_part_{i}.jsonl"
        print(f"({i}/{PART_COUNT + 1}) Uploading file:", file_name)

        file = open(file_name, "rb")
        zhipu_file = client.files.create(
            file = file,
            purpose = "batch",
        )

        print(f"({i}/{PART_COUNT + 1}) Uploaded file. ID:", zhipu_file.id)

        batch = client.batches.create(
            input_file_id=zhipu_file.id,
            endpoint="/v4/chat/completions",
            completion_window="24h",
            metadata={
                "description": f"Paper metadata extraction part {i}/{PART_COUNT + 1}"
            }
        )

        print(f"({i}/{PART_COUNT + 1}) Created batch:", batch)

        file.close()
