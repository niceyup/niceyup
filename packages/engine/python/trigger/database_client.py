from typing import List, Optional, TypedDict
from sqlalchemy import create_engine, inspect, Engine

class ColumnMetadata(TypedDict):
    name: str
    data_type: str
    foreign_table: Optional[str]
    foreign_column: Optional[str]

class TableMetadata(TypedDict):
    name: str
    columns: List[ColumnMetadata]

class DatabaseClient:
    def __init__(
        self,
        dialect: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
        database: Optional[str] = None,
        schema: Optional[str] = None,
        file_path: Optional[str] = None,
    ):
        self.dialect = dialect
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.schema = schema
        self.file_path = file_path

    def create_engine(self) -> Engine:
        if self.dialect == "sqlite":
            return create_engine(f"sqlite:///{self.file_path}")

        elif self.dialect == "mysql":
            return create_engine(f"mysql+pymysql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}")

        elif self.dialect == "postgresql":
            return create_engine(f"postgresql+pg8000://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}")

        else:
            raise ValueError(f"Unsupported dialect: {self.dialect}")

    def get_db_schema(self) -> List[TableMetadata]:
        engine = self.create_engine()
        inspector = inspect(engine)

        tables_metadata_dict = {}
        
        for table_name in inspector.get_table_names(schema=self.schema):
            columns = inspector.get_columns(table_name)
            foreign_keys = inspector.get_foreign_keys(table_name)

            tables_metadata_dict[table_name] = {
                "name": table_name,
                "columns": [],
            }

            for col in columns:
                column_name = col['name']
                data_type = str(col['type'])

                fk = next((fk for fk in foreign_keys if column_name in fk['constrained_columns']), None)

                foreign_table = fk['referred_table'] if fk else None
                foreign_column = fk['referred_columns'][0] if fk else None

                tables_metadata_dict[table_name]["columns"].append({
                    "name": column_name,
                    "data_type": data_type,
                    "foreign_table": foreign_table,
                    "foreign_column": foreign_column,
                })

        tables_metadata = list(tables_metadata_dict.values())

        engine.dispose()
        return tables_metadata
