// Two playable cards for each of Africa's 54 countries. The first card is a
// country profile; the second is a challenge card. Keeping this as data makes
// the deck editable and suitable for future CMS/admin tooling.
export const countries = [
  ["Algeria", "Algiers", "North"], ["Angola", "Luanda", "Central"], ["Benin", "Porto-Novo", "West"], ["Botswana", "Gaborone", "Southern"], ["Burkina Faso", "Ouagadougou", "West"], ["Burundi", "Gitega", "East"],
  ["Cabo Verde", "Praia", "West"], ["Cameroon", "Yaounde", "Central"], ["Central African Republic", "Bangui", "Central"], ["Chad", "N'Djamena", "Central"], ["Comoros", "Moroni", "East"], ["Republic of the Congo", "Brazzaville", "Central"],
  ["Cote d'Ivoire", "Yamoussoukro", "West"], ["Democratic Republic of the Congo", "Kinshasa", "Central"], ["Djibouti", "Djibouti", "East"], ["Egypt", "Cairo", "North"], ["Equatorial Guinea", "Malabo", "Central"], ["Eritrea", "Asmara", "East"],
  ["Eswatini", "Mbabane", "Southern"], ["Ethiopia", "Addis Ababa", "East"], ["Gabon", "Libreville", "Central"], ["The Gambia", "Banjul", "West"], ["Ghana", "Accra", "West"], ["Guinea", "Conakry", "West"],
  ["Guinea-Bissau", "Bissau", "West"], ["Kenya", "Nairobi", "East"], ["Lesotho", "Maseru", "Southern"], ["Liberia", "Monrovia", "West"], ["Libya", "Tripoli", "North"], ["Madagascar", "Antananarivo", "East"],
  ["Malawi", "Lilongwe", "East"], ["Mali", "Bamako", "West"], ["Mauritania", "Nouakchott", "West"], ["Mauritius", "Port Louis", "East"], ["Morocco", "Rabat", "North"], ["Mozambique", "Maputo", "Southern"],
  ["Namibia", "Windhoek", "Southern"], ["Niger", "Niamey", "West"], ["Nigeria", "Abuja", "West"], ["Rwanda", "Kigali", "East"], ["Sao Tome and Principe", "Sao Tome", "Central"], ["Senegal", "Dakar", "West"],
  ["Seychelles", "Victoria", "East"], ["Sierra Leone", "Freetown", "West"], ["Somalia", "Mogadishu", "East"], ["South Africa", "Pretoria", "Southern"], ["South Sudan", "Juba", "East"], ["Sudan", "Khartoum", "North"],
  ["Tanzania", "Dodoma", "East"], ["Togo", "Lome", "West"], ["Tunisia", "Tunis", "North"], ["Uganda", "Kampala", "East"], ["Zambia", "Lusaka", "Southern"], ["Zimbabwe", "Harare", "Southern"],
].map(([country, capital, region]) => ({ country, capital, region }));

export const africaDeck = countries.flatMap((country) => [
  { id: `${country.country}-profile`, type: "PROFILE", ...country },
  { id: `${country.country}-challenge`, type: "CHALLENGE", ...country },
]);

export const cardModes = [
  { id: "quick-facts", title: "Quick Facts Showdown", prompt: "Race to name the capital. One point for every correct answer." },
  { id: "matching", title: "Country Matching", prompt: "Match each capital to its country before time runs out." },
  { id: "card-war", title: "Igiti Card War", prompt: "Draw against the house. The highest knowledge streak wins the round." },
  { id: "guess-country", title: "Guess the Country", prompt: "Use the clue, region, and capital to identify the country." },
  { id: "who-am-i", title: "Who am I?", prompt: "Hold the answer back and reveal clues one at a time." },
  { id: "regional", title: "Regional Challenges", prompt: "Collect cards from every African region." },
  { id: "thematic", title: "Thematic Discovery", prompt: "Explore a region and discover connections between countries." },
  { id: "roleplay", title: "Country Roleplay Day", prompt: "Pick a card, become the country, and share what you learn." },
];
