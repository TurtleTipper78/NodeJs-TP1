const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js")

//Configurations
dotenv.config();

const server = express();
////////////////

server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());

//Middlewares
//Doit être avant les routes/points d'accès
server.use(express.static(path.join(__dirname, "public")));

// Points d'accès
server.get("/donnees", async (req, res) => {
    //Ceci sera remplacé par un fetch ou un appel à la base de données
    // commentaire temp const donnees = require("./data/donneesTest.js");

    console.log(req.query);
    const direction = req.query["order-direction"];
    const limit = +req.query["limit"] || 1000;

    const donneesRef =  await db.collection("test").orderBy("user", direction).limit(limit).get();
    const donneesFinale = [];

    donneesRef.forEach((doc)=>{
        donneesFinale.push(doc.data());
    })

    res.statusCode = 200;
    res.json(donneesFinale);
});

/**
 * @method GET
 * @param id
 * @see url à consulter
 * Permet d'accéder à un utilisateur
 */
server.get("/donnees/:id", (req, res) => {
    // console.log(req.params.id);
    const donnees = require("./data/donneesTest.js");

    const utilisateur = donnees.find((element) => {
        return element.id == req.params.id;
    });

    if (utilisateur) {
        res.statusCode = 200;
        res.json(utilisateur);
    } else {
        res.statusCode = 404;
        res.json({ message: "Utilisateur non trouvé" });
    }
});

// DOIT Être la dernière!!
// Gestion page 404 - requête non trouvée

server.use((req, res) => {
    res.statusCode = 404;
    res.render("404", { url: req.url });
});

server.listen(process.env.PORT, () => {
    console.log("Le serveur a démarré");
});
