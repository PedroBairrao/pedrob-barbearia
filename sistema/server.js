// npm i express pg jsonwebtoken
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(express.static(__dirname + '/public'));

const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'senai', database: 'saep_db' });
const q = async (sql, p) => (await pool.query(sql, p)).rows;
const SEGREDO = 'saep_jwt', CHAVE = 'saep_chave';

// ---------- LOGIN ----------
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Informe usuário e senha.' });
  const r = await q('SELECT id,nome FROM usuarios WHERE email=$1 AND senha=crypt($2,senha)', [email, senha]);
  if (!r.length) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  const token = jwt.sign({ id: r[0].id, nome: r[0].nome }, SEGREDO, { expiresIn: '1h' }); // expira em 1h
  res.json({ token, nome: r[0].nome });
});

// ---------- AUTENTICAÇÃO ----------
app.use('/api', (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SEGREDO); next(); }
  catch { res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' }); }
});

// ---------- CLIENTES (com busca) ----------
app.get('/api/clientes', async (req, res) => {
  const b = `%${req.query.busca || ''}%`;
  res.json(await q(
    `SELECT id,nome,pgp_sym_decrypt(cpf,$1) cpf,telefone FROM clientes
     WHERE nome ILIKE $2 OR telefone ILIKE $2 ORDER BY nome`, [CHAVE, b]));
});
app.post('/api/clientes', async (req, res) => {
  const { nome, cpf, telefone } = req.body;
  await q('INSERT INTO clientes (nome,cpf,telefone) VALUES ($1,pgp_sym_encrypt($2,$3),$4)', [nome, cpf, CHAVE, telefone]);
  res.json({ ok: true });
});

// ---------- BARBEIROS ----------
app.get('/api/barbeiros', async (req, res) => {
  res.json(await q('SELECT id,nome,pgp_sym_decrypt(cpf,$1) cpf,telefone FROM barbeiros ORDER BY nome', [CHAVE]));
});
app.post('/api/barbeiros', async (req, res) => {
  const { nome, cpf, telefone } = req.body;
  await q('INSERT INTO barbeiros (nome,cpf,telefone) VALUES ($1,pgp_sym_encrypt($2,$3),$4)', [nome, cpf, CHAVE, telefone]);
  res.json({ ok: true });
});

// ---------- SERVIÇOS (barbeiro obrigatório) ----------
app.get('/api/servicos', async (req, res) => {
  res.json(await q('SELECT s.id,s.nome,s.preco,b.nome barbeiro FROM servicos s JOIN barbeiros b ON b.id=s.barbeiro_id ORDER BY s.nome'));
});
app.post('/api/servicos', async (req, res) => {
  const { nome, preco, barbeiro_id } = req.body;
  if (!barbeiro_id) return res.status(400).json({ erro: 'Selecione o barbeiro responsável.' });
  await q('INSERT INTO servicos (nome,preco,barbeiro_id) VALUES ($1,$2,$3)', [nome, preco, barbeiro_id]);
  res.json({ ok: true });
});

// ---------- AGENDAMENTOS (ordenados por dia e hora) ----------
app.get('/api/agendamentos', async (req, res) => {
  res.json(await q(
    `SELECT a.id,to_char(a.data,'DD/MM/YYYY') data,to_char(a.hora,'HH24:MI') hora,
            c.nome cliente,c.telefone telefone,s.nome servico,s.preco,b.nome barbeiro
     FROM agendamentos a JOIN clientes c ON c.id=a.cliente_id
     JOIN servicos s ON s.id=a.servico_id JOIN barbeiros b ON b.id=s.barbeiro_id
     ORDER BY a.data,a.hora`));
});
app.post('/api/agendamentos', async (req, res) => {
  const { cliente_id, servico_id, data, hora } = req.body;
  const r = await q(
    `SELECT a.id FROM agendamentos a JOIN servicos s ON s.id=a.servico_id
     WHERE a.data=$1 AND a.hora=$2 AND s.barbeiro_id=(SELECT barbeiro_id FROM servicos WHERE id=$3)`,
    [data, hora, servico_id]);
  if (r.length) return res.status(409).json({ erro: 'Barbeiro já tem atendimento nesse horário.' });
  await q('INSERT INTO agendamentos (cliente_id,servico_id,data,hora) VALUES ($1,$2,$3,$4)', [cliente_id, servico_id, data, hora]);
  res.json({ ok: true });
});

app.listen(3000, () => console.log('http://localhost:3000'));
