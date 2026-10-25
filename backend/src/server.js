require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./Routes/authRoutes");
const ambienteRoutes = require("./Routes/ambienteRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        message: "Backend funcionando!"
    });
});

app.use("/api", authRoutes);
app.use("/api", ambienteRoutes);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
    console.log(`Backend rodando na porta ${port}`);
});
