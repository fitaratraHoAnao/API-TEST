const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const router = express.Router();

// Fonction pour récupérer la liste des livres bibliques
async function getBooks() {
    const url = "https://baiboly.katolika.org/";

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const books = [];

        $(".row a").each((i, el) => {
            const bookText = $(el).text().trim();
            if (bookText && !["mamaky baiboly mitohy", "lisitry ny voatahiry"].includes(bookText)) {
                books.push(bookText);
            }
        });

        if (books.length === 0) throw new Error("Aucun livre trouvé");
        return books;
    } catch (error) {
        throw new Error("Impossible d'accéder au site");
    }
}

// Fonction pour récupérer les chapitres d'un livre donné
async function getChapters(boky) {
    const url = `https://baiboly.katolika.org/boky/${boky}`;

    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const title = $("h1").text().trim();

        if (!title) throw new Error("Livre introuvable");

        const chapters = [];
        $("div a").each((i, el) => {
            const chapter = $(el).text().trim();
            if (chapter) chapters.push(chapter);
        });

        // Liste des chapitres à exclure
        const excludeChapters = [
            "1. Fitadiavana",
            "2. Boky rehetra",
            "3. Hamaky",
            "4. Fanazavana",
            "5. Hisoratra anarana",
            "6. Hiditra"
        ];

        // Nettoyage et suppression des éléments non souhaités
        const uniqueChapters = [...new Set(chapters)]
            .filter(chap => chap !== "Fandraisana" && chap !== "Eugene Heriniaina") // Exclusions existantes
            .filter(chap => !excludeChapters.includes(chap)); // Exclure les chapitres non souhaités

        const chaptersWithNumbers = uniqueChapters.map((chap, i) => `${i + 1}. ${chap}`);

        if (chaptersWithNumbers.length === 0) throw new Error("Aucun chapitre trouvé");
        return { title, chapters: chaptersWithNumbers };
    } catch (error) {
        throw new Error("Erreur lors de la récupération des chapitres");
    }
}

// Route pour récupérer la liste des livres
router.get('/baiboly', async (req, res) => {
    try {
        const books = await getBooks();
        res.json({ livres: books });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour récupérer les chapitres d'un livre spécifique
router.get('/tadiavina', async (req, res) => {
    const { boky } = req.query;

    if (!boky) {
        return res.status(400).json({ error: "Veuillez fournir un livre avec le paramètre 'boky'" });
    }

    try {
        const result = await getChapters(boky);
        res.json({ titre: result.title, chapitres: result.chapters });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route 404
router.use((req, res) => {
    res.status(404).json({ error: "Route non trouvée" });
});

module.exports = router;
