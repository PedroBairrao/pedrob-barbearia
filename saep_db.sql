-- PostgreSQL / pgAdmin
-- 1) Crie o banco "saep_db" (botão direito em Databases > Create)
-- 2) Abra o Query Tool nele e execute este script
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS agendamentos, servicos, barbeiros, clientes, usuarios CASCADE;

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha TEXT NOT NULL                 -- bcrypt (crypt)
);

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf BYTEA NOT NULL,                 -- criptografado (pgp_sym_encrypt)
  telefone VARCHAR(20)
);

CREATE TABLE barbeiros (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cpf BYTEA NOT NULL,                 -- criptografado
  telefone VARCHAR(20)
);

CREATE TABLE servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  preco NUMERIC(8,2) NOT NULL,
  barbeiro_id INT NOT NULL REFERENCES barbeiros(id)
);

CREATE TABLE agendamentos (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id),
  servico_id INT NOT NULL REFERENCES servicos(id),
  data DATE NOT NULL,
  hora TIME NOT NULL
);

-- Senha de todos os usuários: 123456
INSERT INTO usuarios (nome,email,senha) VALUES
('Admin','admin@barbearia.com',crypt('123456',gen_salt('bf'))),
('Recepção','recepcao@barbearia.com',crypt('123456',gen_salt('bf'))),
('Gerente','gerente@barbearia.com',crypt('123456',gen_salt('bf')));

INSERT INTO clientes (nome,cpf,telefone) VALUES
('João Silva',pgp_sym_encrypt('11111111111','saep_chave'),'48999990001'),
('Pedro Souza',pgp_sym_encrypt('22222222222','saep_chave'),'48999990002'),
('Carlos Lima',pgp_sym_encrypt('33333333333','saep_chave'),'48999990003');

INSERT INTO barbeiros (nome,cpf,telefone) VALUES
('Marcos',pgp_sym_encrypt('44444444444','saep_chave'),'48988880001'),
('Rafael',pgp_sym_encrypt('55555555555','saep_chave'),'48988880002'),
('André',pgp_sym_encrypt('66666666666','saep_chave'),'48988880003');

INSERT INTO servicos (nome,preco,barbeiro_id) VALUES
('Corte Masculino',40.00,1),
('Barba',30.00,2),
('Corte + Barba',65.00,3);

INSERT INTO agendamentos (cliente_id,servico_id,data,hora) VALUES
(1,1,'2026-11-03','09:00'),
(2,2,'2026-11-03','10:30'),
(3,3,'2026-11-04','14:00');
