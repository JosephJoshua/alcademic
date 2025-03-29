from remotezip import RemoteZip

def main():
    # Download first 999 pdfs
    url = "https://open-data-set.oss-cn-beijing.aliyuncs.com/dataset/pdf11000.zip"
    with RemoteZip(url) as z:
        all_files = z.namelist()
        for file_name in all_files[:1000]:
            z.extract(file_name, path='./pdfs')
