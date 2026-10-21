import { Pool } from "pg";

let pool=null;

function getPool(){
  if(pool||!process.env.DATABASE_URL) return pool;
  pool=new Pool({
    connectionString:process.env.DATABASE_URL,
    max:3,
    ssl:process.env.DATABASE_SSL==="false"?false:{rejectUnauthorized:false}
  });
  pool.on("error",error=>console.error("Torclix order-status PostgreSQL pool error",error));
  return pool;
}

function mapOrder(row){
  if(!row) return null;
  return {
    id:row.id,
    organizationId:row.organization_id,
    projectId:row.project_id,
    customerId:row.customer_id,
    customerName:row.customer_name,
    customerEmail:row.customer_email,
    customerPhone:row.customer_phone,
    status:row.status,
    currency:row.currency,
    total:Number(row.total||0),
    source:row.source,
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    stockReleasedAt:row.stock_released_at
  };
}

export async function updateOrderStatusWithStockRelease(orderId,organizationId,status,fallbackUpdate){
  const db=getPool();
  if(!db) return fallbackUpdate();

  const client=await db.connect();
  try{
    await client.query("begin");
    const found=await client.query(
      "select * from orders where id=$1::uuid and organization_id=$2::uuid for update",
      [orderId,organizationId]
    );
    if(!found.rowCount){
      await client.query("rollback");
      return null;
    }

    const current=found.rows[0];
    const shouldRelease=(status==="cancelled"||status==="refunded")&&!current.stock_released_at;
    if(shouldRelease){
      const items=await client.query(
        "select catalog_item_id,quantity from order_items where order_id=$1::uuid and catalog_item_id is not null",
        [orderId]
      );
      for(const item of items.rows){
        await client.query(
          "update catalog_items set stock=stock+$2,updated_at=now() where id=$1::uuid and stock is not null",
          [item.catalog_item_id,item.quantity]
        );
      }
    }

    const updated=await client.query(
      "update orders set status=$3,stock_released_at=case when $3 in ('cancelled','refunded') and stock_released_at is null then now() else stock_released_at end,updated_at=now() where id=$1::uuid and organization_id=$2::uuid returning *",
      [orderId,organizationId,status]
    );
    await client.query("commit");
    return mapOrder(updated.rows[0]);
  }catch(error){
    try{await client.query("rollback");}catch{}
    throw error;
  }finally{
    client.release();
  }
}
