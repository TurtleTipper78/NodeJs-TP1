const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");

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
server.get("/donnees", (req, res) => {
    //Ceci sera remplacé par un fetch ou un appel à la base de données
    const donnees = require("./data/donneesTest.js");

    res.statusCode = 200;
    res.json(donnees);
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
