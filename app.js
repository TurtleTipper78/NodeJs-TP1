const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");

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

//Permet d'accepter des body en Json dans les requêtes
server.use(express.json());

// Points d'accès
server.get("/donnees", async (req, res) => {
    try {
        //Ceci sera remplacé par un fetch ou un appel à la base de données
        // const donnees = require("./data/donneesTest.js");
        console.log(req.query);
        const direction = req.query["order-direction"] || "asc";
        const limit = +req.query["limit"] || 50; //Mettre une valeur par défaut

        const donneesRef = await db.collection("test").orderBy("user", direction).limit(limit).get();
        const donneesFinale = [];

        donneesRef.forEach((doc) => {
            donneesFinale.push(doc.data());
        });

        res.statusCode = 200;
        res.json(donneesFinale);
    } catch (erreur) {
        res.statusCode = 500;
        res.json({ message: "Une erreur est survenue. Meilleure chance la prochaine fois" });
    }
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

server.post("/donnees", async (req, res) => {
    try {
        const test = req.body;

        //Validation des données
        if (test.user == undefined) {
            res.statusCode = 400;
            return res.json({ message: "Vous devez fournir un utilisateur" });
        }

        await db.collection("test").add(test);

        res.statusCode = 201;
        res.json({ message: "La donnée a été ajoutée", donnees: test });
    } catch (error) {
        res.statusCode = 500;
        res.json({ message: "erreur" });
    }
});

server.post("/donnees/initialiser", (req, res) => {
    const donneesTest = require("./data/donneesTest.js");

    donneesTest.forEach(async(element) => {
        await db.collection("test").add(element);
    });

    res.statusCode = 200;

    res.json({
        message: "Donne initialisées",
    });
    
    
});

server.put("/donnees/:id", async (req,res)=>{
    const id = req.params.id;
    const donneesModifiees = req.body;
    //Validatio ici

    await db.collection("test").doc(id).update(donneesModifiees);

    res.statusCode = 200;
    res.json({message: " La donnée a été modifiée"})
});

server.delete("/donnees/:id", async (req, res) => {
    const id = req.params.id;

    const resultat = await db.collection("test").doc(id).delete();

    res.statusCode = 200;
    res.json({ message: "Le document a été supprimé" });
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