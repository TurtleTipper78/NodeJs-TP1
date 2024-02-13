const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const bcrypt = require("bcrypt");
const {check, validationResult} = require("express-validator")

//Configurations
dotenv.config();

const server = express();

server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());

//Middlewares
//Doit être avant les routes/points d'accès
server.use(express.static(path.join(__dirname, "public")));

//Permet d'accepter des body en Json dans les requêtes
server.use(express.json());

////////////////////INIT////////////////////

// FILM DONE

server.post("/films/initialiser", (req, res) => {
    try{
        const donneesTest = require("./data/filmsTest.js");

        donneesTest.forEach(async (element) => {
            await db.collection("film").add(element);
        });

        res.statusCode = 200;

        res.json({
            message: "DB Film connecté",
        });
    } catch (erreur) {
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon, film non-init" });
    }
});

// UTILISATEUR DONE

server.post("/utilisateurs/initialiser", (req, res) => {
    try{
        const donneesTest = require("./data/utilisateurTest.js");

        donneesTest.forEach(async (element) => {
            await db.collection("utilisateur").add(element);
        });

        res.statusCode = 200;

        res.json({
            message: "DB Utilisateur connecté",
        });
    } catch (erreur) {
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon, utilisateur non-init" });
    }
});

///////////////////////////////////////////

////////////////////GET////////////////////

//FILM LISTE

server.get("/films", async (req, res) => {
    try {
        console.log(req.query);
        
        const tri = req.query.tri || "titre";
        const direction = req.query["order-direction"] || "asc";

        if (tri == "titre" || tri == "realisation" || tri == "annee") {
            const donneesRef = await db.collection("film").orderBy(tri, direction).limit(50).get();
            const donneesFinale = [];

            donneesRef.forEach((doc) => {
                donneesFinale.push(doc.data());
            });

            res.statusCode = 200;
            res.json(donneesFinale);
        }

    } catch (erreur) {
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon, quel film?" });
    }
});

//UTILISATEUR LISTE

server.get("/utilisateurs", async (req, res) => {
    try {
        console.log(req.query);
        const direction = req.query["order-direction"] || "asc";
        const limit = +req.query["limit"] || 100; 

        const donneesRef = await db.collection("utilisateur").orderBy("courriel", direction).limit(limit).get();
        const donneesFinale = [];

        donneesRef.forEach((doc) => {
            donneesFinale.push(doc.data());
        });

        res.statusCode = 200;
        res.json(donneesFinale);
    } catch (erreur) {
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon, quel utilisateur?" });
    }
});

//FILMS ID

server.get("/films/:id", async (req, res) => {
    try{
        const filmId = req.params.id;

        const donneeRef = await db.collection("film").doc(filmId).get();

        const donnee = donneeRef.data();

        if (donnee) {
            res.statusCode = 200;
            res.json(donnee);
        } else {
            res.statusCode = 404;
            res.json({ message: "film non trouvé" });
        }
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon, film non trouvé" });
    }
    
});

//UTILISATEUR ID

server.get("/utilisateurs/:id", async (req, res) => {
    try{
        const utilisateurId = req.params.id;

        const donneeRef = await db.collection("utilisateur").doc(utilisateurId).get();

        const donnee = donneeRef.data();

        if (donnee) {
            res.statusCode = 200;
            res.json(donnee);
        } else {
            res.statusCode = 404;
            res.json({ message: "utilisateur non trouvé" });
        }
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon" });
    }
});

///////////////////////////////////////////

//POST UTILISATEUR

// server.post("/utilisateurs", async (req, res) => {
//     try {
//         const test = req.body;

//         //Validation des données
//         if (test.user == undefined) {
//             res.statusCode = 400;
//             return res.json({ message: "Vous devez fournir un utilisateur" });
//         }

//         await db.collection("utilisateur").add(test);

//         res.statusCode = 201;
//         res.json({ message: "L'utilisateur a été ajoutée", donnees: test });
//     } catch (error) {
//         res.statusCode = 500;
//         res.json({ message: "erreur" });
//     }
// });

//INSCRIPTION UTILISATEUR

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
    try{
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
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui n'inscrit pas" });
    }
});

//CONNEXION UTILISATEUR

server.post("/utilisateurs/connexion", async (req, res) => {
    try{
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
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui se connecte pas" });
    }
});

////////////////////PUT////////////////////

//MODIFICATION FILM

server.put("/films/:id", async (req, res) => {
    try{
        const id = req.params.id;
        const donneesModifiees = req.body;

        await db.collection("films").doc(id).update(donneesModifiees);

        res.statusCode = 200;
        res.json({ message: "Le film a été modifiée" });
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui n'update pas" });
    }
});

///////////////////////////////////////////

////////////////////DELETE////////////////////

//DELETE FILM

server.delete("/films/:id", async (req, res) => {
    try{
        const id = req.params.id;

        const resultat = await db.collection("film").doc(id).delete();

        res.statusCode = 200;
        res.json({ message: "Le film a été supprimé" });
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui ne delete pas" });
    }    
});

///////////////////////////////////////////


// DOIT Être la dernière!!
// Gestion page 404 - requête non trouvée

server.use((req, res) => {
    res.statusCode = 404;
    res.render("404", { url: req.url });
});

server.listen(process.env.PORT, () => {
    console.log("Le serveur a démarré");
});
