const jwt = require("jsonwebtoken");
const db = require("../config/db.js")

const auth = async(req,res,next)=>{
    try {//si le jeton est valide
        if(req.headers.authorization){
            const jetonAValier = req.headers.authorization.split(" ")[1];
            const jetonDecode = jwt.verify(jetonAValier,process.env.JWT_SECRET);

            const utilisateurVerifie = await db.collection("utilisateur").doc(jetonDecode.id)

            if(utilisateurVerifie.exist){
                const utilisateurRecupere = utilisateurVerifie.data();
                req.utilisateur = utilisateurRecupere;

                // Appelle la suite de la requete initial
                next();
            } else {
                // si utilisateur existe pas, on retourne une erreur non auth
                throw new Error("non autorisé")
            }
            
        } else {
            throw new Error("non autorisé")
        }
    }catch(erreur){
        res.statusCode = 401;
        res.json({ message: erreur.message })
    }
}

module.exports = auth;