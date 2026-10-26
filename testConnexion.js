
require("dotenv").config();

async function testerConnexion() {
    try {
        const clientId = process.env.SENTINEL_CLIENT_ID;
        const clientSecret = process.env.SENTINEL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error(
                "Identifiants absents du fichier .env."
            );
        }

        const url =
            "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

        const formulaire = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret
        });

        console.log("Connexion à Copernicus...");

        const reponse = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formulaire
        });

        const resultat = await reponse.json();

        if (!reponse.ok) {
            throw new Error(
                `Erreur HTTP ${reponse.status} : ${
                    resultat.error_description ||
                    resultat.error ||
                    "Échec de l'authentification"
                }`
            );
        }

        if (!resultat.access_token) {
            throw new Error("Aucun jeton d'accès reçu.");
        }

        console.log("Connexion réussie !");
        console.log("Jeton d'accès obtenu.");
        console.log("Type :", resultat.token_type);
        console.log(
            "Expiration dans", resultat.expires_in, "secondes"
        );

    } catch (erreur) {
        console.error("Échec :", erreur.message);
    }
}

testerConnexion();
