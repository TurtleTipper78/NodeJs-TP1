const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const db = require("./config/db.js");
const bcrypt = require("bcrypt");
const mustacheExpress = require("mustache-express");

const {check, validationResult} = require("express-validator")

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
server.get("/films", async (req, res) => {
    try {
        console.log(req.headers.authorization);
        //Ceci sera remplacé par un fetch ou un appel à la base de données
        // const films = require("./data/filmsTest.js");
        console.log(req.query);
        const direction = req.query["order-direction"] || "asc";
        const limit = +req.query["limit"] || 50; //Mettre une valeur par défaut

        const filmsRef = await db.collection("test").orderBy("user", direction).limit(limit).get();
        const filmsFinale = [];

        donneesRef.forEach((doc) => {
            filmsFinale.push(doc.data());
        });

        res.statusCode = 200;
        res.json( filmsFinale);
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
server.get("/films/:id", (req, res) => {
    // console.log(req.params.id);
    const films = require("./data/filmsTest.js");

    const utilisateur = films.find((element) => {
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

server.post("/films", async (req, res) => {
    try {
        const test = req.body;

        //Validation des données
        if (test.user == undefined) {
            res.statusCode = 400;
            return res.json({ message: "Vous devez fournir un utilisateur" });
        }

        await db.collection("test").add(test);

        res.statusCode = 201;
        res.json({ message: "Le film a été ajoutée", donnees: test });
    } catch (error) {
        res.statusCode = 500;
        res.json({ message: "erreur" });
    }
});

server.post("/films/initialiser", (req, res) => {
    const filmsTest = require("./data/filmsTest.js");

    filmsTest.forEach(async (element) => {
        await db.collection("test").add(element);
    });

    res.statusCode = 200;

    res.json({
        message: "Films initialisées",
    });
});

server.put("/films/:id", async (req, res) => {
    const id = req.params.id;
    const filmsModifiees = req.body;
    //Validation ici

    await db.collection("test").doc(id).update(filmsModifiees);

    res.statusCode = 200;
    res.json({ message: "Le Film a été modifiée" });
});

server.delete("/films/:id", async (req, res) => {
    const id = req.params.id;

    const resultat = await db.collection("test").doc(id).delete();

    res.statusCode = 200;
    res.json({ message: "Le film a été supprimé" });
});

server.post("/utilisateurs/inscription",[
    check("courriel").escape().trim().notEmpty().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:8, max:20}).isStrongPassword({
        minlength:8,
        maxLength:20,
        minLowercase:1,
        minNumbers:1,
        minUppercase:1,
        minSymbols:1
    })
],
async (req, res) => {
    const validation = validationResult(req);
    if (validation.errors.length > 0) {
        res.statusCode = 400;
        return res.json({ message: "Données non-conformes" });
    }
    // On récupère les infos du body

    // const courriel = req.body.courriel;
    // const mdp = req.body.mdp;

    const { courriel, mdp } = req.body;
    console.log(courriel);
    // On vérifie si le courriel existe
    const docRef = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
    const utilisateurs = [];

    docRef.forEach((doc) => {
        utilisateurs.push(doc.data());
    });

    console.log(utilisateurs);
    // TODO: Si oui, erreur

    if(utilisateurs.length > 0){
        res.statusCode = 400;
        res.json({message:"Le courriel existe déjà"});
    }

    // On valide/nettoie la donnée
    // TODO:

    // On encrypte le mot de passe
    // process.env.SALT
    const hash = await bcrypt.hash(mdp,10 );

    // On enregistre dans la DB
    const nouvelUtilisateur = {courriel, "mdp": hash};
    await db.collection("utilisateurs").add(nouvelUtilisateur)

    delete nouvelUtilisateur.mdp;
    // On renvoie true;
    res.statusCode = 200;
    res.json(nouvelUtilisateur);
});

server.post("/utilisateurs/connexion", async (req, res) => {
    // On récupère les infos du body
    const { mdp, courriel } = req.body;

    // On vérifie si le courriel existe
    const docRef = await db.collection("utilisateurs").where("courriel", "==", courriel).get();

    const utilisateurs = [];
    docRef.forEach((utilisateur) => {
        utilisateurs.push(utilisateur.data());
    });
    // Si non, erreur
    if (utilisateurs.length == 0) {
        res.statusCode = 400;
        return res.json({ message: "Courriel invalide" });
    }

    const utilisateurAValider = utilisateurs[0];
    const estValide = await bcrypt.compare(mdp,utilisateurAValider.mdp)
    // On compare
    if (!estValide) {
        res.statusCode = 400;
        return res.json({ message: "Mot de passe invalide"});
    }
    
    // Si pas pareil, erreur
    // On retourne les infos de l'utilisateur sans le mot de passe
    delete utilisateurAValider.mdp;
    res.status = 200;
    res.json(utilisateurAValider);
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
