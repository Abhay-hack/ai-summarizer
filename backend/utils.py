# backend/utils.py

def split_text(text, max_len=1000):
    """
    Split long text into smaller chunks for summarization
    """
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start+max_len])
        start += max_len
    return chunks
