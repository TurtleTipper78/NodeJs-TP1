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

///////////////////////////////////////////

////////////////////GET////////////////////

/**
 * Gère les requêtes GET pour récupérer les données des films.
 * Prend en charge le tri et la pagination.
 */

server.get("/films", async (req, res) => {

    try {
        const tri = req.query.tri || "titre";
        const direction = req.query["order-direction"] || "asc";

        if (tri == "titre" || tri == "realisation" || tri == "annee" && direction == "asc" || direction == "desc") {
            const donneesRef = await db.collection("film").orderBy(tri, direction).limit(50).get();
            const donneesFinale = [];

            if(donneesRef.size <= 0){
                    const donneesTest = require("./data/filmsTest.js");
            
                    donneesTest.forEach(async (element) => {
                        await db.collection("film").add(element);
                    });
            
                    return res.json({
                        message: "DB Film connecté",
                    });
            }

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

/**
 * Gère les requêtes GET pour récupérer les données des utilisateurs.
 * Prend en charge le tri et la pagination.
 */

server.get("/utilisateur", async (req, res) => {
    try {
        console.log(req.query);
        const direction = req.query["order-direction"] || "asc";
        const limit = +req.query["limit"] || 100; 

        const donneesRef = await db.collection("utilisateur").orderBy("courriel", direction).limit(limit).get();
        const donneesFinale = [];

        if(donneesRef.size <= 0){
            const donneesTest = require("./data/utilisateurTest.js");

            donneesTest.forEach(async (element) => {
                await db.collection("utilisateur").add(element);
            });

            res.statusCode = 200;

            return res.json({
                message: "DB Utilisateur connecté",
        });
        }

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

/**
 * Gère les requêtes GET pour récupérer un film spécifique par ID.
 */

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

/**
 * Gère les requêtes GET pour récupérer un utilisateur spécifique par ID.
 */

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
        res.json({ message: "Vous êtes un pas bon, utilisateur non trouvé" });
    }
});

///////////////////////////////////////////

/**
 * Gère les requêtes POST pour l'inscription d'un utilisateur.
 * Valide les données d'entrée et chiffre le mot de passe avant de le stocker dans la base de données.
 */

server.post("/utilisateur/inscription",[
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
        const docRef = await db.collection("utilisateur").where("courriel", "==", courriel).get();
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
        await db.collection("utilisateur").add(nouvelUtilisateur)

        delete nouvelUtilisateur.mdp;
        // On renvoie true;
        res.statusCode = 200;
        res.json(nouvelUtilisateur);
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui n'inscrit pas" });
    }
});

/**
 * Gère les requêtes POST pour la connexion de l'utilisateur.
 * Compare les informations fournies avec les données stockées pour authentifier l'utilisateur.
 */

server.post("/utilisateur/connexion", async (req, res) => {
    try{
        // On récupère les infos du body
        const { mdp, courriel } = req.body;

        // On vérifie si le courriel existe
        const docRef = await db.collection("utilisateur").where("courriel", "==", courriel).get();

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
/**
 * Gère les requêtes PUT pour mettre à jour les données d'un film.
 */

server.put("/films/:id",[
    check("annee").escape().trim().notEmpty(),
    check("description").escape().trim().notEmpty(),
    check("genres").escape().trim().notEmpty(),
    check("realisation").escape().trim().notEmpty(),
    check("titre").escape().trim().notEmpty(),
    check("titreVignette").escape().trim().notEmpty(),
], async (req, res) => {
    try{
        const id = req.params.id;
        const donneesModifiees = req.body;

        await db.collection("film").doc(id).update(donneesModifiees);

        res.statusCode = 200;
        res.json({ message: "Le film a été modifiée" });
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui n'update pas" });
    }
});


/**
 * Gère les requêtes PUT pour mettre à jour les données d'un utilisateur.
 */

server.put("/utilisateur/:id",[
    check("courriel").escape().trim().notEmpty().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:8, max:20}).isStrongPassword({
        minlength:8,
        maxLength:20,
        minLowercase:1,
        minNumbers:1,
        minUppercase:1,
        minSymbols:1
    })
], async (req, res) => {
    try{
        const id = req.params.id;
        const donneesModifiees = req.body;

        await db.collection("utilisateur").doc(id).update(donneesModifiees);

        res.statusCode = 200;
        res.json({ message: "L'utilisateur a été modifiée" });
    }catch (error){
        res.statusCode = 500;
        res.json({ message: "Vous êtes un pas bon qui n'update pas" });
    }
});

///////////////////////////////////////////

////////////////////DELETE////////////////////

/**
 * Gère les requêtes DELETE pour supprimer un film de la base de données.
 */

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

/**
 * Gère les requêtes DELETE pour supprimer un utilisateur de la base de données.
 */

server.delete("/utilisateur/:id", async (req, res) => {
    try{
        const id = req.params.id;

        const resultat = await db.collection("utilisateur").doc(id).delete();

        res.statusCode = 200;
        res.json({ message: "L'utilisateur a été supprimé" });
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
