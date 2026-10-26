
const parcelle = {
    latitude: 6.13,
    longitude: 1.22
};

const debut = "20261001";
const fin = "20261007";

const parametresDemandes = [
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "PRECTOTCORR",
    "RH2M",
    "WS10M",
    "WS10M_MAX",
    "WD10M",
    "ALLSKY_SFC_SW_DWN",
    "PS"
];

async function recupererMeteo() {
    try {
        // 1. Construire l'URL de l'API NASA POWER
        const url = new URL(
            "https://power.larc.nasa.gov/api/temporal/daily/point"
        );

        url.searchParams.set(
            "parameters",
            parametresDemandes.join(",")
        );
        url.searchParams.set("community", "AG");
        url.searchParams.set("latitude", parcelle.latitude);
        url.searchParams.set("longitude", parcelle.longitude);
        url.searchParams.set("start", debut);
        url.searchParams.set("end", fin);
        url.searchParams.set("format", "JSON");

        console.log("Connexion à NASA POWER...");

        // 2. Récupérer les données
        const reponse = await fetch(url);

        if (!reponse.ok) {
            throw new Error(`Erreur HTTP : ${reponse.status}`);
        }

        const donnees = await reponse.json();

        if (!donnees.properties?.parameter) {
            throw new Error("Les paramètres météorologiques sont absents.");
        }

        const parametres = donnees.properties.parameter;

        // 3. Vérifier que les paramètres nécessaires sont disponibles
        for (const nom of parametresDemandes) {
            if (!parametres[nom]) {
                throw new Error(
                    `Le paramètre ${nom} est absent de la réponse NASA.`
                );
            }
        }

        // 4. Organiser les données par jour
        const temperatures = parametres.T2M;

        const donneesOrganisees = Object.keys(temperatures).map(date => ({
            date: date,
            temperatureMoyenne: parametres.T2M[date],
            temperatureMaximale: parametres.T2M_MAX[date],
            temperatureMinimale: parametres.T2M_MIN[date],
            precipitations: parametres.PRECTOTCORR[date],
            humiditeRelative: parametres.RH2M[date],
            vitesseVent: parametres.WS10M[date],
            vitesseVentMaximale: parametres.WS10M_MAX[date],
            directionVent: parametres.WD10M[date],
            rayonnementSolaire: parametres.ALLSKY_SFC_SW_DWN[date],
            pressionAtmospherique: parametres.PS[date]
        }));

        console.log("\n=== DONNÉES MÉTÉOROLOGIQUES ===");
        console.log(JSON.stringify(donneesOrganisees, null, 2));

        // 5. Calculer les indicateurs météorologiques
        const valeursValides = valeurs =>
            valeurs.filter(
                valeur =>
                    Number.isFinite(valeur) &&
                    valeur !== -999
        );

        const pluies = valeursValides(
            donneesOrganisees.map(jour => jour.precipitations)
        );

        const temperaturesMoyennes = valeursValides(
            donneesOrganisees.map(jour => jour.temperatureMoyenne)
        );

        const temperaturesMaximales = valeursValides(
            donneesOrganisees.map(jour => jour.temperatureMaximale)
        );

        const temperaturesMinimales = valeursValides(
            donneesOrganisees.map(jour => jour.temperatureMinimale)
        );

        const somme = valeurs =>
            valeurs.reduce((total, valeur) => total + valeur, 0);

        const moyenne = valeurs =>
            valeurs.length > 0 ? somme(valeurs) / valeurs.length : null;

        const resultatAnalyse = {
            nombreJours: donneesOrganisees.length,

            joursAvecPluieValide: pluies.length,

            cumulPrecipitationsMm:
                pluies.length > 0
                    ? Number(somme(pluies).toFixed(2))
                    : null,

            temperatureMoyennePeriodeC:
                moyenne(temperaturesMoyennes) === null
                    ? null
                    : Number(
                        moyenne(temperaturesMoyennes).toFixed(2)
                    ),

            temperatureMaximaleObserveeC:
                temperaturesMaximales.length > 0
                    ? Math.max(...temperaturesMaximales)
                    : null,

            temperatureMinimaleObserveeC:
                temperaturesMinimales.length > 0
                    ? Math.min(...temperaturesMinimales)
                    : null
        };

        console.log("\n=== ANALYSE MÉTÉOROLOGIQUE ===");
        console.log(JSON.stringify(resultatAnalyse, null, 2));

    } catch (erreur) {
        console.error("\nErreur :", erreur.message);

        if (erreur.cause) {
            console.error("Cause :", erreur.cause);
        }
    }
}

recupererMeteo();
