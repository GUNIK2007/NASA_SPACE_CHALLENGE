
const parcelle = {
    latitude: 6.13,
    longitude: 1.22
};

async function rechercherImagesSatellite() {
    try {
        const url =
            "https://stac.dataspace.copernicus.eu/v1/search";

        // Petite zone autour du point choisi
        const rayon = 0.02;

        const recherche = {
            collections: ["sentinel-2-l2a"],

            bbox: [
                parcelle.longitude - rayon,
                parcelle.latitude - rayon,
                parcelle.longitude + rayon,
                parcelle.latitude + rayon
            ],

            datetime: "2026-09-01T00:00:00Z/2026-10-24T23:59:59Z",

            limit: 5
        };

        console.log("Recherche des images Sentinel-2...");

        const reponse = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(recherche)
        });

        if (!reponse.ok) {
            throw new Error(`Erreur HTTP : ${reponse.status}`);
        }

        const resultat = await reponse.json();

        

        const images = resultat.features || [];

        // Trier les images selon leur couverture nuageuse
        const imagesTriees = [...images].sort((a, b) => {
            const nuagesA = a.properties["eo:cloud_cover"] ?? 100;
            const nuagesB = b.properties["eo:cloud_cover"] ?? 100;

            return nuagesA - nuagesB;
        });

        // Préparer les informations à afficher
        const imagesOrganisees = imagesTriees.map(image => ({
            identifiant: image.id,
            date: image.properties.datetime,
            couvertureNuageuse:
                image.properties["eo:cloud_cover"] ?? "Inconnue"
        }));

console.log("\n=== IMAGES LES MOINS NUAGEUSES ===");
console.log(JSON.stringify(imagesOrganisees, null, 2));


console.log("\n=== IMAGES LES MOINS NUAGEUSES ===");
console.log(JSON.stringify(imagesOrganisees, null, 2));


        console.log(`\nImages trouvées : ${images.length}`);
        
        console.log(
            JSON.stringify(imagesOrganisees, null, 2)
        );

    } catch (erreur) {
        console.error("Erreur :", erreur.message);
    }
}

rechercherImagesSatellite();
