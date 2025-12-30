import os

def tmp_dir() -> str:
    """
    Returns the temporary directory for the application.
    """
    tmp_dir = os.environ["TMP_DIR"]

    if tmp_dir == "" or tmp_dir is None:
        raise ValueError("TMP_DIR is not set")

    return tmp_dir
