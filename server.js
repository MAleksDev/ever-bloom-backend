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
    
        const records = await base('Products')
            .select({
                filterByFormula: `{ID Product} = "${productId}"`,
                maxRecords: 1,
            })
            .firstPage()

        if (records.length === 0) {
            console.log('Product not found in Airtable for ID:', productId)
            return res.status(404).json({ error: 'Produkt nie znaleziony.' })
        }

        const record = records[0] // Pobierz pierwszy (i jedyny) znaleziony rekord

        const productData = {
            id: record.id, // To jest wewnętrzny ID rekordu Airtable (np. recXXXXXXXX)
            name: record.fields['Product Name'],
            price: record.fields['Price'],
            description: record.fields['Description'],
            img:
                record.fields['Image'] && record.fields['Image'].length > 0
                    ? record.fields['Image'][0].url
                    : 'https://placehold.co/600x400/cccccc/000000?text=No+Image',
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
                        'Invalid field name in Airtable query. Check field names in Airtable (especially "ID Product").',
                })
        }
        if (error.message.includes('NOT_FOUND') || error.message.includes('INVALID_RECORD_ID')) {
            return res.status(404).json({ error: 'The product with the given ID does not exist.' })
        }
        res.status(500).json({ error: 'Server error while retrieving product details.' })
    }
})

// ENDPOINT: Sprawdzenie stanu magazynowego
app.post('/check-stock', async (req, res) => {
    const { product } = req.body
    console.log(`Received check-stock request for product: "${product}"`)

    // Nazwa pola dla nazwy produktu to 'Product Name' zgodnie ze zdjęciem Airtable.
    const filterFormula = `{Product Name} = "${product}"`
    console.log(`Airtable filter formula for stock check: ${filterFormula}`)

    try {
        const records = await base('Products')
            .select({
                filterByFormula: filterFormula,
                maxRecords: 1,
            })
            .firstPage()

        console.log(`Airtable response records count for stock check: ${records.length}`)
        if (records.length > 0) {
            console.log('Found record for stock check:', records[0].fields)
        }

        if (records.length === 0) {
            console.log('Product not found in Airtable to check status:', product) // Zmieniono log
            return res.status(404).json({ error: 'Product not found' })
        }

        const stock = records[0].fields.Stock || 0
        console.log('Stock for', product, ':', stock)
        res.json({ stock })
    } catch (error) {
        console.error('Airtable error in /check-stock:', error.message)
        res.status(500).json({ error: 'Server error while checking stock.' })
    }
})

// ENDPOINT: Tworzenie sesji Stripe z weryfikacją stanu
app.post('/create-checkout-session', async (req, res) => {
    console.log('Request to create a checkout session received:', req.body)
    const { product, price } = req.body

    if (!product || !price) {
        console.error('Error: Missing data in session creation request checkout:', req.body)
        return res.status(400).json({ error: 'No product or price.' })
    }

    try {
        const records = await base('Products')
            .select({
                filterByFormula: `{Product Name} = "${product}"`,
                maxRecords: 1,
            })
            .firstPage()

        if (records.length === 0) {
            console.log('Product not found in Airtable when creating session:', product)
            return res.status(404).json({ error: 'Product not found.' })
        }

        const stock = records[0].fields.Stock || 0
        if (stock <= 0) {
            console.log('Product unavailable in stock:', product)
            return res.status(400).json({ error: 'Product unavailable.' })
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
            // success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            // cancel_url: `${req.headers.origin}/cancel.html`,
            success_url: `https://ever-bloom-backend.onrender.com/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://ever-bloom-backend.onrender.com/cancel`,
            locale: 'en',
            metadata: {
            product: product,
    },
        })

        console.log('Stripe session created successfully. ID:', session.id)
        res.json({ id: session.id })
    } catch (error) {
        console.error('Stripe error creating session:', error.message)
        res.status(500).json({ error: 'Error creating session: ' + error.message })
    }
})

// ENDPOINT: Sukces płatności – zapis zamówienia i aktualizacja stanu
app.get('/success', async (req, res) => {
    const sessionId = req.query.session_id
    console.log('Endpoint /success called with sessionId:', sessionId)

    if (!sessionId) {
        console.log('No sessionId in /success query')
        return res.status(400).send('No session ID.')
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items'],
        })
        console.log('Stripe session downloaded:', session.id)

        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
        console.log('PaymentIntent status:', paymentIntent.status)

        if (paymentIntent.status === 'succeeded') {
            // let productName = 'Unknown Product'
            // if (session.line_items && session.line_items.data && session.line_items.data.length > 0) {
            //     productName = session.line_items.data[0].price?.product_data?.name || session.line_items.data[0].description
            // }
            const productName = session.metadata?.product || 'Unknown Product'


            console.log('Product for order (from Stripe session):', productName)

            if (!productName || productName === 'Unknown Product') {
                // Dodatkowo sprawdzamy, czy nie jest 'Unknown Product'
                console.error(
                    'Error: Failed to retrieve product name from Stripe session. Line_items session:',
                    JSON.stringify(session.line_items, null, 2)
                ) // Logowanie całej struktury
                return res.status(500).send('Error: Failed to identify product after payment.')
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
                console.log('Saved to Airtable – Orders')
            } catch (airtableCreateError) {
                console.error('Error creating order record in Airtable:', airtableCreateError.message)
            }

            const filterFormula = `{Product Name} = "${productName}"`
            console.log(`Filter formula for stock update: ${filterFormula}`) 

            const productRecords = await base('Products') 
                .select({
                    filterByFormula: filterFormula, 
                    maxRecords: 1,
                })
                .firstPage()

            if (productRecords.length > 0) {
                const recordId = productRecords[0].id
                const currentStock = productRecords[0].fields.Stock || 0 

                console.log(`Current stock for "${productName}": ${currentStock}`) // Logowanie aktualnego stanu
                const newStock = Math.max(0, currentStock - 1) // Upewnij się, że stan nie spadnie poniżej zera

                try {
                    // Dodany try-catch dla operacji aktualizacji stanu magazynowego
                    await base('Products').update(recordId, {
                        Stock: newStock,
                    })
                    console.log('Stock updated for:', productName, 'na', newStock) // Logowanie nowego stanu
                } catch (airtableUpdateError) {
                    console.error('Error updating stock in Airtable:', airtableUpdateError.message)
                }
            } else {
                console.warn('Warning: Product not found in Products table to update status:', productName)
            }
        } else {
            console.log('Payment failed for session:', sessionId, 'Status:', paymentIntent.status)
        }

        // res.send('Payment successful! You can return to the shop.')
        res.sendFile(path.join(__dirname, 'public/success.html'))

    } catch (error) {
        console.error('Error in endpointcie /success:', error.message)
        res.status(500).send('Error processing payment after success: ' + error.message)
    }
})

app.get('/cancel', (req, res) => {
    console.log('Endpoint /cancel wywołany.')
    res.send('Payment cancelled. Return to the shop.')
})

// ---- Obsługa błędów 404 (TEN KOD MUSI BYĆ OSTATNI W KOLEJNOŚCI PRZED app.listen) ----
app.use(function (req, res, next) {
    console.log(`404 Not Found for request: ${req.method} ${req.url}`)
    res.status(404).send('Sorry, we could not find this page!')
})

// Uruchamianie serwera
const PORT = process.env.PORT || 3000

const bodyParser = require('body-parser')

// STRIPE: Webhook endpoint (important to use raw body for signature verification)
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature']

    let event
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Obsługa zdarzenia typu "checkout.session.completed"
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        console.log('✅ Webhook: Payment successful session received:', session.id)

        try {
            // Pobierz dane line_items (np. nazwę produktu)
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
            const item = lineItems.data[0]
            const productName = item.description || 'Unknown Product'
            const amountTotal = session.amount_total || 0

            console.log(`Webhook: Product = "${productName}", Sum = ${amountTotal}`)

            // 1. Zapisz zamówienie w Airtable
            await base('Zamówienia').create({
                'ID zamówienia': session.payment_intent,
                Produkt: productName,
                Kwota: amountTotal,
                Data: new Date().toISOString(),
                Status: 'Zakończone',
            })

            // 2. Zaktualizuj stan magazynowy
            const records = await base('Products')
                .select({ filterByFormula: `{Product Name} = "${productName}"`, maxRecords: 1 })
                .firstPage()

            if (records.length > 0) {
                const recordId = records[0].id
                const stock = records[0].fields.Stock || 0
                const newStock = Math.max(0, stock - 1)

                await base('Products').update(recordId, { Stock: newStock })
                console.log(`Webhook: Stock updated "${productName}" na ${newStock}`)
            } else {
                console.warn(`Webhook: Produkt "${productName}" not found in the database for status update`)
            }

            res.status(200).send('Webhook processed successfully.')
        } catch (err) {
            console.error('❌ Error processing webhook:', err.message)
            res.status(500).send('Webhook processing error')
        }
    } else {
        // Obsłuż inne zdarzenia, jeśli potrzebujesz
        console.log(`ℹ️ Webhook: Ignored event type ${event.type}`)
        res.status(200).send('Event ignored.')
    }
})

app.get('/api/session-details', async (req, res) => {
  const sessionId = req.query.session_id
  if (!sessionId) return res.status(400).json({ error: 'No session_id' })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    })
    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)

    const lineItem = session.line_items.data[0]
    const productName = lineItem.description || lineItem.price?.product_data?.name || 'Unknown product'

    res.json({
      product: productName,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
    })
  } catch (error) {
    console.error('Error /api/session-details:', error.message)
    res.status(500).json({ error: 'Failed to retrieve session data' })
  }
})


app.listen(PORT, () => console.log(`Server running on port ${PORT}`))