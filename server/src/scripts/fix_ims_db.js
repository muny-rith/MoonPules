const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  user: 'postgres.fauoowvhahnolsulbbzl',
  password: 'L7yh3mYfxtgV%/e',
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to IMS Supabase DB...');

  // 1. Create users view
  await pool.query(`
    CREATE OR REPLACE VIEW users AS 
    SELECT user_id AS id, name, email, password, role, created_at, updated_at 
    FROM tb_user;
  `);
  console.log('Created view: users');

  // 2. Create categories view
  await pool.query(`
    CREATE OR REPLACE VIEW categories AS 
    SELECT category_id, category_name, description, created_at, updated_at 
    FROM tb_category;
  `);
  console.log('Created view: categories');

  // 3. Create products view
  await pool.query(`
    CREATE OR REPLACE VIEW products AS 
    SELECT product_id, product_code, product_name, category_id, department, 25.00::numeric AS unit_price, is_active, image_url, created_at, updated_at 
    FROM tb_product;
  `);
  console.log('Created view: products');

  // 4. Create stock_balances view
  await pool.query(`
    CREATE OR REPLACE VIEW stock_balances AS 
    SELECT stock_balance_id, variant_id AS product_id, on_hand_qty, reserved_qty, updated_at 
    FROM tb_stock_balance;
  `);
  console.log('Created view: stock_balances');

  // 5. Seed categories if empty
  await pool.query(`
    INSERT INTO tb_category (category_name, description)
    VALUES 
      ('Cosmetics', 'Beauty and Skincare products'),
      ('Jewelry', 'Fine and fashion jewelry'),
      ('Apparel', 'Clothing and fashion accessories')
    ON CONFLICT (category_name) DO NOTHING;
  `);
  console.log('Ensured categories in tb_category');

  // 6. Seed sample products in tb_product if empty
  const prods = await pool.query('SELECT COUNT(*) FROM tb_product');
  if (parseInt(prods.rows[0].count, 10) === 0) {
    const catCosmetics = (await pool.query("SELECT category_id FROM tb_category WHERE category_name = 'Cosmetics'")).rows[0]?.category_id || 1;
    const catJewelry = (await pool.query("SELECT category_id FROM tb_category WHERE category_name = 'Jewelry'")).rows[0]?.category_id || 1;
    const catApparel = (await pool.query("SELECT category_id FROM tb_category WHERE category_name = 'Apparel'")).rows[0]?.category_id || 1;

    await pool.query(`
      INSERT INTO tb_product (product_code, product_name, category_id, department, is_active, image_url)
      VALUES 
        ('SKU-LIP-001', 'Moon Velvet Matte Lipstick (Cherry Moon)', $1, 'Beauty', true, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&auto=format&fit=crop&q=80'),
        ('SKU-GLW-002', 'Luminous Hydra Glow Serum (50ml)', $1, 'Skincare', true, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'),
        ('SKU-JWL-003', 'Celestial Crescent Moon Pendant (18k Gold)', $2, 'Accessories', true, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80'),
        ('SKU-BAG-004', 'Aurora Minimalist Vegan Leather Tote', $3, 'Bags', true, 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&auto=format&fit=crop&q=80'),
        ('SKU-PRF-005', 'Midnight Bloom Eau de Parfum (100ml)', $1, 'Fragrance', true, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80'),
        ('SKU-WAT-006', 'Eclipse Chronograph Watch (Onyx Black)', $2, 'Watches', true, 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80')
    `, [catCosmetics, catJewelry, catApparel]);
    console.log('Seeded products into tb_product');
  }

  console.log('Migration complete!');
  await pool.end();
}

run().catch(e => {
  console.error('Error during migration:', e);
  process.exit(1);
});
