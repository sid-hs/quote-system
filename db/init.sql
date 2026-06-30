-- QuotePro Database Schema for MariaDB

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(100) DEFAULT '',
    rfc VARCHAR(50) DEFAULT '',
    balance DECIMAL(12,2) DEFAULT 0,
    credit_limit DECIMAL(12,2) DEFAULT 50000,
    status VARCHAR(50) DEFAULT 'Activo',
    recurrency VARCHAR(50) DEFAULT 'Baja',
    last_activity DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(255) DEFAULT 'General',
    cost DECIMAL(12,2) DEFAULT 0,
    price DECIMAL(12,2) DEFAULT 0,
    mayoreo_price DECIMAL(12,2) DEFAULT 0,
    distribuidor_price DECIMAL(12,2) DEFAULT 0,
    promo_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS labor_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(255) DEFAULT 'Servicio',
    cost DECIMAL(12,2) DEFAULT 0,
    price DECIMAL(12,2) DEFAULT 0,
    mayoreo_price DECIMAL(12,2) DEFAULT 0,
    distribuidor_price DECIMAL(12,2) DEFAULT 0,
    promo_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(255) DEFAULT 'Licencia',
    cost DECIMAL(12,2) DEFAULT 0,
    price DECIMAL(12,2) DEFAULT 0,
    mayoreo_price DECIMAL(12,2) DEFAULT 0,
    distribuidor_price DECIMAL(12,2) DEFAULT 0,
    promo_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    client_id INT NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) DEFAULT '',
    client_email VARCHAR(255) DEFAULT '',
    client_phone VARCHAR(100) DEFAULT '',
    date DATE NOT NULL,
    validity DATE DEFAULT NULL,
    validity_days INT DEFAULT 30,
    payment_terms VARCHAR(100) DEFAULT 'Contado',
    amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'enviada',
    items_count INT DEFAULT 0,
    `lines` LONGTEXT DEFAULT NULL,
    notes TEXT DEFAULT '',
    discount_type VARCHAR(20) DEFAULT 'none',
    discount_value DECIMAL(12,2) DEFAULT 0,
    iva_enabled TINYINT(1) DEFAULT 0,
    down_payment_pct DECIMAL(5,2) DEFAULT 0,
    financing_pct DECIMAL(5,2) DEFAULT 0,
    credit_days INT DEFAULT 0,
    optional_discount_type VARCHAR(20) DEFAULT 'none',
    optional_discount_value DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    client_id INT NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pendiente',
    items_count INT DEFAULT 0,
    `lines` LONGTEXT DEFAULT NULL,
    notes TEXT DEFAULT '',
    discount_type VARCHAR(20) DEFAULT 'none',
    discount_value DECIMAL(12,2) DEFAULT 0,
    iva_enabled TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    value LONGTEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Demo data
INSERT INTO clients (name, contact, email, phone, rfc, balance, credit_limit, status, recurrency) VALUES
('Tecnologias del Futuro S.A.', 'Juan Perez', 'jperez@tecfuturo.com', '+52 55 2345 6789', 'TFU010101ABC', 45000, 100000, 'Activo', 'Alta'),
('Soluciones Integrales MX', 'Maria Gonzalez', 'mgonzalez@simx.com', '+52 81 9876 5432', 'SIM020202DEF', 12000, 50000, 'Activo', 'Media'),
('Constructora del Norte', 'Carlos Ramirez', 'cramirez@cdn.com', '+52 33 4567 8901', 'CDN030303GHI', 89000, 150000, 'Alerta', 'Alta'),
('Distribuidora Central', 'Ana Lopez', 'alopez@dcentral.com', '+52 55 8765 4321', 'DCE040404JKL', 0, 75000, 'Activo', 'Baja'),
('Inmobiliaria Premium', 'Roberto Sanchez', 'rsanchez@ipremium.com', '+52 81 2345 6789', 'IPR050505MNO', 230000, 300000, 'Bloqueado', 'Alta');

INSERT INTO products (name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price) VALUES
('Servidor Dell PowerEdge R740', 'SRV-DELL-001', 'Hardware', 45000, 65000, 60000, 55000, 58000),
('Licencia Windows Server 2022', 'LIC-WS-001', 'Software', 8000, 12000, 11000, 9500, 10000),
('Switch Cisco Catalyst 2960', 'NET-CIS-001', 'Redes', 15000, 22000, 20000, 18000, 19500),
('Instalacion y Configuracion', 'SRV-INST-001', 'Servicio', 3000, 8000, 7500, 7000, 7000),
('Firewall FortiGate 60F', 'SEC-FOR-001', 'Seguridad', 18000, 28000, 26000, 24000, 25000),
('Cableado Estructurado CAT6', 'CAB-CAT6-001', 'Infraestructura', 25, 45, 42, 38, 40),
('Licencia Office 365 Business', 'LIC-O365-001', 'Software', 850, 1500, 1400, 1200, 1300),
('Rack Servidor 42U', 'RCK-42U-001', 'Hardware', 8000, 14000, 13000, 11500, 12000);

INSERT INTO labor_items (name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price) VALUES
('Ingeniero de Sistemas - Dia', 'LAB-ING-001', 'Servicio', 1200, 3500, 3200, 3000, 3000),
('Tecnico de Campo - Dia', 'LAB-TEC-001', 'Servicio', 800, 2200, 2100, 2000, 2000),
('Consultoria IT - Hora', 'LAB-CON-001', 'Consultoria', 500, 1500, 1400, 1300, 1200),
('Soporte Remoto - Hora', 'LAB-SUP-001', 'Servicio', 300, 800, 750, 700, 700);

INSERT INTO license_items (name, sku, category, cost, price, mayoreo_price, distribuidor_price, promo_price) VALUES
('Licencia SQL Server Enterprise', 'LIC-SQL-ENT', 'Licencia', 45000, 75000, 70000, 65000, 68000),
('Licencia VMware vSphere', 'LIC-VMW-001', 'Licencia', 25000, 42000, 40000, 36000, 38000),
('Licencia Antivirus Empresarial', 'LIC-AV-001', 'Licencia', 350, 650, 600, 520, 550),
('Licencia Backup Enterprise', 'LIC-BKP-001', 'Licencia', 8000, 15000, 14000, 12500, 13000);

INSERT INTO settings (`key`, `value`) VALUES
('companyName', '"Mi Empresa S.A. de C.V."'),
('companyRFC', '"MEE010101ABC"'),
('companyAddress', '"Av. Principal 123, Ciudad de Mexico"'),
('companyPhone', '"+52 55 1234 5678"'),
('companyEmail', '"ventas@miempresa.com"'),
('companyWeb', '"www.miempresa.com"'),
('bankName', '"Banco Nacional de Mexico"'),
('bankAccount', '"1234 5678 9012 3456"');
