import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import path from "path";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true })); /* middleware che mi permette di leggere input dei form nel dom */
app.use(express.static("public"));                  /* mi permette di uscire lo standard dei file statici come i file css */
const __dirname = path.resolve();
// Middleware per servire file statici dalla directory 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Configura il motore di template EJS
app.set('view engine', 'ejs');
app.use(express.static("public"));
// Imposta il motore di visualizzazione su EJS
app.set('view engine', 'ejs');
// Imposta la directory delle viste
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
// Imposta EJS come motore di rendering
app.set('view engine', 'ejs');
const db = new pg.Client({                      /* inizio ad impostare il db per richiamarlo */
    user: "postgres",
    host: "localhost",
    database: "book",
    password: "postgres",
    port: 5432,
  });
  
  db.connect();         /* mi connetto al database */
  
  let item = [
    { id: 1, title: "The Lord of Rings", descr: "Miglior saga di sempre", rating: "PERFECT"  },
  ];

// Funzione per generare stelle
function getStars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function getInitialDate() {
  return new Date(); // Ottiene la data corrente una volta
  }

  app.get("/about.ejs", async (req, res) => {
    try {
      res.render("about.ejs");
    } catch (err) {
      console.log(err);
    }
  })

/* CON IL GET OTTENGO NELL'INDEX.EJS TUTTI IL LIBRI NEL DATABASE */
  app.get("/", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM item ORDER BY id ASC");
      item = result.rows;
      console.log(item);
      const total = item.length;
        // Inizializza la data iniziale
        const initialDate = getInitialDate();
        const day = String(initialDate.getDate()).padStart(2, '0');
        const month = String(initialDate.getMonth() + 1).padStart(2, '0');
        const year = initialDate.getFullYear();
        const formattedDateSQL = `${day}-${month}-${year}`; // Formato compatibile con SQL
        console.log(formattedDateSQL);  
      res.render("index.ejs", { item, total, formattedDateSQL});
    } catch (err) {
      console.log(err);
    }
  })

/* CON IL GET OTTENGO TRAMITE ID LA SELEZIONE SPECIFICA PER LA MODIFICA */
  app.get("/edit/:id", async (req, res) => {
    const id = req.params.id;
    const result = await db.query("SELECT * FROM item WHERE id=($1)", [id]);
    item = result.rows[0];
    res.render("edit.ejs", { item });
  });

/* CON IL POST PERMETTO DI SALVARE LE MODIFICHE CON IL TASTO SALVA */
  app.post("/edit/:id", async (req, res) => {
    const id = req.params.id;
    const title = req.body.title;
    const descr = req.body.descr;
    const rating = parseInt(req.body.rating, 10);
    await db.query("UPDATE item set title = $1, descr = $2, rating = $3 WHERE id=($4)", [title, descr, rating, id]);
    res.redirect("/");
  });


  /* CON IL POST PERMETTO DI INSERIRE I DATI NEL DATABASE */
  app.post('/add', async (req, res) => {
        const title = req.body.title;   /* Acquisco il titolo inserito dall'utente */
        const descr = req.body.descr;   /* Acquisco la descrizione inserita dall'utente */
        const rating = req.body.rating; /* Acquisco la valutazione inserita dall'utente */
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const formattedDateSQL = `${year}-${month}-${day}`; // Formato compatibile con SQL
        const stars = getStars(item.rating);
        console.log(stars);
      try {
        // Cerca il libro tramite l'API di Open Library
        const searchUrl = `http://openlibrary.org/search.json?title=${title}`;  /* Collegamento all'URL API tramite titolo del libro */
        const response = await axios.get(searchUrl);
        const results = response.data;  /* restituisco il collogamento all'URL API */

        if (results.numFound > 0) {       /* con l'if gestisco l'esistenza della cover, se esiste:  */
            const book = results.docs[0]; /* prendi il primo risultato che restituisce la ricerca nell'API  */
            const isbn = book.isbn ? book.isbn[0] : null; /* prendo dal book, l'ISN  */
            const cover_url = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : ''; /* cerco per ISB la cover  */
            await db.query("INSERT INTO item(title, descr, rating, cover_url, creation_date) VALUES ($1, $2, $3, $4, $5)", [title, descr, rating, cover_url, date]); /* inserisco tutto il risultato nel DB  */
            res.redirect("/"); } else {
                res.status(404).json({ cover_url: '', comment: 'Nessuna copertina trovata.' }); /* Gestisce l'errore quando non trova la cover del libro */
            }
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Errore interno del server' });
    }
  });



/* CON IL POST PERMETTO DI ELIMINARE DAL DB */
  app.post('/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
      await db.query("DELETE FROM item WHERE id = $1", [id]);
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  });


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
