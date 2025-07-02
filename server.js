require('dotenv').config()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const Airtable = require('airtable')
const cors = require('cors')
const path = require('path')

const app = express()

app.use(express.json())
app.use(cors())
app.use(express.static('public')) // Serwuje pliki z katalogu 'public'

// Konfiguracja Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

// --- START NOWEGO KODU - ENDPOINT /config ---
// NOWY ENDPOINT: Udostępnij publiczny klucz Stripe frontendowi
app.get('/config', (req, res) => {
    try {
        const publishableKey = process.env.STRIPE_PUBLIC_KEY;
        if (!publishableKey) {
            console.error('SERVER ERROR: STRIPE_PUBLIC_KEY is not set in .env');
            return res.status(500).send({ error: 'Stripe public key not configured on server.' });
        }
        res.status(200).send({ publishableKey: publishableKey });
        console.log('Server: Sent Stripe public key to frontend.');
    } catch (error) {
        console.error('Server error when serving /config:', error);
        res.status(500).send({ error: 'Internal server error.' });
    }
});
// --- KONIEC NOWEGO KODU - ENDPOINT /config ---


// ENDPOINT: Pobieranie danych produktu po ID (np. z URL `?id=2`)
// Na podstawie zdjęcia Airtable, pole ID to 'ID Product'.
app.get('/product-by-id', async (req, res) => {
    const productId = req.query.id // Pobierz ID z query stringa (np. "1", "2")
    console.log(`Received request for /product-by-id with ID: "${productId}"`)

    if (!productId) {
        console.error('Error: Product ID is missing from the request.')
        return res.status(400).json({ error: 'Brak ID produktu.' })
    }

    try {
        // Używamy filterByFormula do znalezienia rekordu na podstawie pola 'ID Product'
        // Nazwa pola "{ID Product}" została potwierdzona na podstawie Twojego zdjęcia Airtable.
        const records = await base('Products')
            .select({
                filterByFormula: `{ID Product} = "${productId}"`, // Używa nazwy pola 'ID Product'
                maxRecords: 1,
            })
            .firstPage()

        if (records.length === 0) {
            console.log('Product not found in Airtable for ID:', productId)
            return res.status(404).json({ error: 'Produkt nie znaleziony.' })
        }

        const record = records[0] // Pobierz pierwszy (i jedyny) znaleziony rekord

        // Zwróć dane produktu w formacie, który oczekuje frontend
        // Nazwy pól zostały dostosowane do nazw widocznych na zdjęciu Airtable.
        const productData = {
            id: record.id, // To jest wewnętrzny ID rekordu Airtable (np. recXXXXXXXX)
            name: record.fields['Product Name'],
            price: record.fields['Price'],
            description: record.fields['Description'],
            // Pole obrazka to 'Image' w Airtable, jest to załącznik (array).
            // Dodano sprawdzenie `.length > 0` dla bezpieczeństwa.
            img:
                record.fields['Image'] && record.fields['Image'].length > 0
                    ? record.fields['Image'][0].url
                    : 'https://placehold.co/600x400/cccccc/000000?text=No+Image',
            // Jeśli masz więcej niż jeden obrazek per produkt w Airtable w polu 'Image',
            // ta linia mapuje wszystkie URL-e. Jeśli 'Image' to zawsze jeden obrazek, nadal będzie działać.
            images:
                record.fields['Image'] && record.fields['Image'].length > 0 ? record.fields['Image'].map(img => img.url) : [],
            stock: record.fields['Stock'],
        }
        console.log('Product data fetched for ID:', productId, productData.name)
        res.json(productData)
    } catch (error) {
        console.error('Error fetching product by ID from Airtable:', error.message)
        // Bardziej szczegółowa obsługa błędów dla formuły Airtable
        if (error.message.includes('invalid: Unknown field names')) {
            return res
                .status(400)
                .json({
                    error:
                        'Nieprawidłowa nazwa pola w zapytaniu do Airtable. Sprawdź nazwy pól w Airtable (szczególnie "ID Product").',
                })
        }
        if (error.message.includes('NOT_FOUND') || error.message.includes('INVALID_RECORD_ID')) {
            return res.status(404).json({ error: 'Produkt o podanym ID nie istnieje.' })
        }
        res.status(500).json({ error: 'Błąd serwera podczas pobierania szczegółów produktu.' })
    }
})

// ENDPOINT: Sprawdzenie stanu magazynowego
app.post('/check-stock', async (req, res) => {
    const { product } = req.body
    console.log(`Received check-stock request for product: "${product}"`)

    // Nazwa pola dla nazwy produktu to 'Product Name' zgodnie ze zdjęciem Airtable.
    const filterFormula = `{Product Name} = "${product}"`
    console.log(`Airtable filter formula for stock check: ${filterFormula}`) // Zmieniono log

    try {
        const records = await base('Products')
            .select({
                filterByFormula: filterFormula,
                maxRecords: 1,
            })
            .firstPage()

        console.log(`Airtable response records count for stock check: ${records.length}`) // Zmieniono log
        if (records.length > 0) {
            console.log('Found record for stock check:', records[0].fields) // Zmieniono log
        }

        if (records.length === 0) {
            console.log('Produkt nie znaleziony w Airtable do sprawdzenia stanu:', product) // Zmieniono log
            return res.status(404).json({ error: 'Produkt nie znaleziony' }) // Usunięto kropkę, aby pasowało do frontendu
        }

        // Nazwa pola dla stanu magazynowego to 'Stock' zgodnie ze zdjęciem Airtable.
        const stock = records[0].fields.Stock || 0
        console.log('Stan magazynowy dla', product, ':', stock)
        res.json({ stock })
    } catch (error) {
        console.error('Błąd Airtable w /check-stock:', error.message)
        res.status(500).json({ error: 'Błąd serwera podczas sprawdzania stanu magazynowego.' })
    }
})

// ENDPOINT: Tworzenie sesji Stripe z weryfikacją stanu
app.post('/create-checkout-session', async (req, res) => {
    console.log('Otrzymano żądanie utworzenia sesji checkout:', req.body)
    const { product, price } = req.body

    if (!product || !price) {
        console.error('Błąd: Brakujące dane w żądaniu utworzenia sesji checkout:', req.body)
        return res.status(400).json({ error: 'Brak produktu lub ceny.' })
    }

    try {
        // Nazwa pola dla nazwy produktu to 'Product Name' zgodnie ze zdjęciem Airtable.
        const records = await base('Products')
            .select({
                filterByFormula: `{Product Name} = "${product}"`,
                maxRecords: 1,
            })
            .firstPage()

        if (records.length === 0) {
            console.log('Produkt nie znaleziony w Airtable podczas tworzenia sesji:', product)
            return res.status(404).json({ error: 'Produkt nie znaleziony.' })
        }

        // Nazwa pola dla stanu magazynowego to 'Stock' zgodnie ze zdjęciem Airtable.
        const stock = records[0].fields.Stock || 0
        if (stock <= 0) {
            console.log('Produkt niedostępny w magazynie:', product)
            return res.status(400).json({ error: 'Produkt niedostępny.' })
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: product,
                        },
                        unit_amount: price,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/cancel.html`,
            locale: 'en',
        })

        console.log('Sesja Stripe utworzona pomyślnie. ID:', session.id)
        res.json({ id: session.id })
    } catch (error) {
        console.error('Błąd Stripe podczas tworzenia sesji:', error.message)
        res.status(500).json({ error: 'Błąd tworzenia sesji: ' + error.message })
    }
})

// ENDPOINT: Sukces płatności – zapis zamówienia i aktualizacja stanu
app.get('/success', async (req, res) => {
    const sessionId = req.query.session_id
    console.log('Endpoint /success wywołany z sessionId:', sessionId)

    if (!sessionId) {
        console.log('Brak sessionId w zapytaniu /success')
        return res.status(400).send('Brak ID sesji.')
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items'],
        })
        console.log('Sesja Stripe pobrana:', session.id)

        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
        console.log('PaymentIntent status:', paymentIntent.status)

        if (paymentIntent.status === 'succeeded') {
            // Zmieniona logika pobierania nazwy produktu z sesji Stripe
            let productName = 'Unknown Product' // Domyślna wartość
            if (session.line_items && session.line_items.data && session.line_items.data.length > 0) {
                // Preferuj nazwę z product_data, jeśli jest dostępna
                productName = session.line_items.data[0].price?.product_data?.name || session.line_items.data[0].description // Użyj description jako fallback
            }

            console.log('Produkt dla zamówienia (z sesji Stripe):', productName)

            if (!productName || productName === 'Unknown Product') {
                // Dodatkowo sprawdzamy, czy nie jest 'Unknown Product'
                console.error(
                    'Błąd: Nie udało się pobrać nazwy produktu z sesji Stripe. Sesja line_items:',
                    JSON.stringify(session.line_items, null, 2)
                ) // Logowanie całej struktury
                return res.status(500).send('Błąd: Nie udało się zidentyfikować produktu po płatności.')
            }

            try {
                // Dodany try-catch dla operacji tworzenia rekordu w Airtable
                await base('Zamówienia').create({
                    // Upewnij się, że 'Zamówienia' to poprawna nazwa tabeli
                    'ID zamówienia': paymentIntent.id,
                    Produkt: productName,
                    Kwota: paymentIntent.amount,
                    Data: new Date().toISOString(),
                    Status: 'Zakończone', // NAJWAŻNIEJSZE: Ta opcja MUSI istnieć w polu Status w Airtable
                })
                console.log('Zapisano do Airtable – Zamówienia')
            } catch (airtableCreateError) {
                console.error('Błąd podczas tworzenia rekordu zamówienia w Airtable:', airtableCreateError.message)
                // Zwróć błąd serwera, ale nie przerywaj całkowicie, aby spróbować zaktualizować stan magazynowy
                // Możesz zdecydować, czy chcesz tu zatrzymać i zwrócić błąd 500
                // return res.status(500).send('Błąd: Nie udało się zapisać zamówienia w Airtable: ' + airtableCreateError.message);
            }

            const filterFormula = `{Product Name} = "${productName}"`
            console.log(`Filter formula for stock update: ${filterFormula}`) // Dodatkowe logowanie formuły filtrowania

            const productRecords = await base('Products') // Upewnij się, że 'Products' to poprawna nazwa tabeli
                .select({
                    filterByFormula: filterFormula, // Nazwa pola to 'Product Name' zgodnie ze zdjęciem Airtable.
                    maxRecords: 1,
                })
                .firstPage()

            if (productRecords.length > 0) {
                const recordId = productRecords[0].id
                const currentStock = productRecords[0].fields.Stock || 0 // POPRAWIONO: Używamy productRecords[0].fields.Stock

                console.log(`Aktualny stan magazynowy dla "${productName}": ${currentStock}`) // Logowanie aktualnego stanu
                const newStock = Math.max(0, currentStock - 1) // Upewnij się, że stan nie spadnie poniżej zera

                try {
                    // Dodany try-catch dla operacji aktualizacji stanu magazynowego
                    await base('Products').update(recordId, {
                        Stock: newStock,
                    })
                    console.log('Stan magazynowy zaktualizowany dla:', productName, 'na', newStock) // Logowanie nowego stanu
                } catch (airtableUpdateError) {
                    console.error('Błąd podczas aktualizacji stanu magazynowego w Airtable:', airtableUpdateError.message)
                    // Możesz zdecydować, czy chcesz tu zatrzymać i zwrócić błąd 500
                }
            } else {
                console.warn('Ostrzeżenie: Produkt nie znaleziony w tabeli Products do aktualizacji stanu:', productName) // Zmieniono na warn
            }
        } else {
            console.log('Płatność nie zakończona sukcesem dla sesji:', sessionId, 'Status:', paymentIntent.status)
        }

        res.send('Payment successful! You can return to the shop.')
    } catch (error) {
        console.error('Błąd w endpointcie /success:', error.message)
        res.status(500).send('Error processing payment after success: ' + error.message)
    }
})

app.get('/cancel', (req, res) => {
    console.log('Endpoint /cancel wywołany.')
    res.send('Payment cancelled. Return to the shop.')
})

// ---- Obsługa błędów 404 (TEN KOD MUSI BYĆ OSTATNI W KOLEJNOŚCI PRZED app.listen) ----
app.use(function (req, res, next) {
    console.log(`404 Not Found dla żądania: ${req.method} ${req.url}`)
    res.status(404).send('Przepraszamy, nie znaleźliśmy tej strony!')
})

// Uruchamianie serwera
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))