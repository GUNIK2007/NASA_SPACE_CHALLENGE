
require("dotenv").config();

const parcelle = {
    latitude: 6.177097,
    longitude: 1.212840 ,
};

// Zone de test autour du point de Lomé
const rayon =  0.001;

const evalscript = `
//VERSION=3

function setup() {
    return {
        input: [{
            bands: ["B04", "B08", "SCL", "dataMask"]
        }],
        output: [
            {
                id: "ndvi",
                bands: 1,
                sampleType: "FLOAT32"
            },
            {
                id: "dataMask",
                bands: 1
            }
        ]
    };
}

function evaluatePixel(samples) {
    const classesNuageuses = [3, 8, 9, 10, 11];

    if (
        samples.dataMask === 0 ||
        classesNuageuses.includes(samples.SCL)
    ) {
        return {
            ndvi: [0],
            dataMask: [0]
        };
    }

    const rouge = samples.B04;
    const procheInfrarouge = samples.B08;
    const somme = procheInfrarouge + rouge;

    if (somme === 0) {
        return {
            ndvi: [0],
            dataMask: [0]
        };
    }

    const ndvi =
        (procheInfrarouge - rouge) / somme;

    return {
        ndvi: [ndvi],
        dataMask: [1]
    };
}
`;

async function calculerNDVI() {
    try {
        const clientId = process.env.SENTINEL_CLIENT_ID;
        const clientSecret = process.env.SENTINEL_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error(
                "Identifiants absents du fichier .env."
            );
        }

        // 1. Obtenir le jeton d'accès
        const urlJeton =
            "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

        const formulaire = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: clientId,
            client_secret: clientSecret
        });

        console.log("Connexion à Copernicus...");

        const reponseJeton = await fetch(urlJeton, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formulaire
        });

        const jeton = await reponseJeton.json();

        if (!reponseJeton.ok || !jeton.access_token) {
            throw new Error(
                "Impossible d'obtenir le jeton d'accès."
            );
        }

        // 2. Préparer la demande de statistiques
        const demande = {
            input: {
                bounds: {
                    bbox: [
                        parcelle.longitude - rayon,
                        parcelle.latitude - rayon,
                        parcelle.longitude + rayon,
                        parcelle.latitude + rayon
                    ],
                    properties: {
                        crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84"
                    }
                },
                data: [{
                    type: "sentinel-2-l2a",
                    dataFilter: {
                        maxCloudCoverage: 30,
                        mosaickingOrder: "leastCC"
                    }
                }]
            },
         
            
            aggregation: {
                timeRange: {
                    from: "2026-09-01T00:00:00Z",
                    to: "2026-10-01T00:00:00Z"
                },
                aggregationInterval: {
                    of: "P30D"
                },
                evalscript: evalscript,
                width: 200,
                height: 200
            }


        };

        // 3. Envoyer la demande à la Statistical API
        console.log("Calcul du NDVI par Sentinel Hub...");

        const reponse = await fetch(
            "https://sh.dataspace.copernicus.eu/statistics/v1",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${jeton.access_token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(demande)
            }
        );

        const resultat = await reponse.json();

        if (!reponse.ok) {
            console.error(
                "Détails de l'API :",
                JSON.stringify(resultat, null, 2)
            );

            throw new Error(
                `Erreur Statistical API : HTTP ${reponse.status}`
            );
        }

        // 4. Afficher les résultats
        console.log("\n=== RÉSULTAT NDVI ===");
        console.log("Statut :", resultat.status);

        if (!resultat.data || resultat.data.length === 0) {
            console.log(
                "Aucune statistique disponible pour cette période."
            );
            return;
        }

        for (const periode of resultat.data) {
            const statistiques =
                periode.outputs?.ndvi?.bands?.B0?.stats;

            console.log("\nPériode :", periode.interval.from,
                "à", periode.interval.to);

            if (!statistiques || statistiques.mean == null) {
                console.log(
                    "Aucune valeur NDVI exploitable pour cette période."
                );
                continue;
            }

            console.log(
                "NDVI moyen :",
                statistiques.mean.toFixed(3)
            );

            console.log(
                "NDVI minimum :",
                statistiques.min.toFixed(3)
            );

            console.log(
                "NDVI maximum :",
                statistiques.max.toFixed(3)
            );

            console.log(
                "Nombre de pixels valides :",
                statistiques.sampleCount
            );

            console.log(
                "Pixels exclus :",
                statistiques.noDataCount
            );
        }

    } catch (erreur) {
        console.error("\nErreur :", erreur.message);
    }
}

calculerNDVI();
