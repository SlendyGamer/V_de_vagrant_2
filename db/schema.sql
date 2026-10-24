CREATE DATABASE IF NOT EXISTS vagrantdb;

USE vagrantdb;

CREATE TABLE IF NOT EXISTS ambiente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    status ENUM('pendente', 'em_execucao', 'terminado', 'erro')
        NOT NULL DEFAULT 'pendente',
    cpu_limit VARCHAR(255) NOT NULL,
    memory_limit VARCHAR(255) NOT NULL,
    io_limit VARCHAR(255) NOT NULL,
    script_path VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS execucoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ambiente_id INT NOT NULL,
    status ENUM('pendente', 'em_execucao', 'terminado', 'erro')
        NOT NULL DEFAULT 'pendente',
    resultado TEXT,
    FOREIGN KEY (ambiente_id) REFERENCES ambiente(id)
);

CREATE USER IF NOT EXISTS 'app'@'10.1.2.10' IDENTIFIED BY 'senha'; 
GRANT ALL PRIVILEGES ON vagrantdb.* TO 'app'@'10.1.2.10'; 
FLUSH PRIVILEGES;