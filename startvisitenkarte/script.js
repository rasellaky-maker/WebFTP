console.log("script.js ist verbunden");

const vorname = "Oleg";
const alter = 19;
const motto = "Fehler sind der beste Lehrer.";
const lieblingsFarbe = "Orange";
const istSchueler = true;
let besucher = 0;

console.log(vorname, typeof vorname);
console.log(alter, typeof alter);
console.log(motto, typeof motto);
console.log(lieblingsFarbe, typeof lieblingsFarbe);
console.log(istSchueler, typeof istSchueler);
console.log(besucher, typeof besucher);

const satz = `Hallo, ich bin ${vorname}, ${alter} Jahre alt und meine Lieblingsfarbe ist ${lieblingsFarbe}.`;
console.log(satz);

let hobby;
console.log(hobby, typeof hobby);
console.log("5" + 3);
console.log(5 + 3);

const titel = document.getElementById("titel");
titel.textContent = vorname;

const mottoElement = document.getElementById("motto");
mottoElement.textContent = motto;

const satzElement = document.getElementById("satz");
satzElement.textContent = satz;

const alterInfo = document.getElementById("alterInfo");
alterInfo.textContent = `Alter: ${alter} · Schüler: ${istSchueler ? "ja" : "nein"}`;

const zaehlerKnopf = document.getElementById("zaehlerKnopf");
const zaehlerAnzeige = document.getElementById("zaehlerAnzeige");

zaehlerKnopf.addEventListener("click", function () {
  besucher = besucher + 1;
  console.log("Zähler:", besucher);
  zaehlerAnzeige.textContent = besucher;
});

const kontaktKnopf = document.getElementById("kontaktKnopf");
const kontaktInfo = document.getElementById("kontaktInfo");

kontaktKnopf.addEventListener("click", function () {
  kontaktInfo.hidden = !kontaktInfo.hidden;
});
