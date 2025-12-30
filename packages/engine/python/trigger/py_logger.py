import json
import logging

class PyLogger(logging.Logger):
    def __init__(self, name: str):
        super().__init__(name)

        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        handler.setFormatter(formatter)
        handler.setLevel(logging.INFO)

        self.addHandler(handler)

    def info(self, msg: object, *args, **kwargs) -> None:
        super().info(json.dumps(msg), *args, **kwargs)

    def warning(self, msg: object, *args, **kwargs) -> None:
        super().warning(json.dumps(msg), *args, **kwargs)
    
    def error(self, msg: object, *args, **kwargs) -> None:
        super().error(json.dumps(msg), *args, **kwargs)
