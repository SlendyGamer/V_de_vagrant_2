// Ponto de entrada do backend: carrega o .env (DB, runner, segredos) e monta as rotas.
// Não há mais código do projeto antigo (pedidos/cozinha); só auth e ambientes.
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./Routes/authRoutes");
const ambienteRoutes = require("./Routes/ambienteRoutes");

const app = express();

app.use(cors());
// 1mb porque o conteúdo dos scripts viaja dentro do JSON
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        message: "Backend funcionando!"
    });
});

// authRoutes (login/cadastro) vem primeiro e é público; ambienteRoutes exige token
app.use("/api", authRoutes);
app.use("/api", ambienteRoutes);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Backend rodando na porta ${port}`);
});
