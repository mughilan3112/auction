from pydantic import BaseModel


class SellerCreate(BaseModel):
    store_name: str
