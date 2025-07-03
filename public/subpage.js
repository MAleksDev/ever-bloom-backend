// Deklaracja zmiennej stripe na zewnątrz, aby była dostępna globalnie
let stripe

// Funkcja do inicjalizacji Stripe po pobraniu klucza z serwera
async function initializeStripe() {
    try {
        console.log('Initializing Stripe: Fetching public key from /config')
        // POPRAWIONO: Prawidłowy adres URL do endpointu /config na Renderze
        const response = await fetch('https://ever-bloom-backend.onrender.com/config')
        if (!response.ok) {
            throw new Error(`Failed to fetch Stripe config: ${response.status} - ${response.statusText}`)
        }
        const { publishableKey } = await response.json()

        if (!publishableKey) {
            throw new Error('Public key not found in server response.')
        }

        stripe = Stripe(publishableKey) // Inicjalizuj Stripe z pobranym kluczem
        console.log('Stripe initialized successfully with public key.')
        checkStock() // Wywołaj funkcję checkStock po zainicjalizowaniu Stripe
    } catch (error) {
        console.error('Error initializing Stripe:', error)
        // Wyświetl błąd użytkownikowi lub zablokuj funkcje płatności
        const buyButton = document.querySelector('.buy-btn')
        if (buyButton) {
            buyButton.disabled = true
            buyButton.textContent = 'Błąd Stripe'
            buyButton.style.backgroundColor = '#dc3545' // Czerwony kolor dla błędu
        }
    }
}

const yearElement = document.querySelector('.year')
const currentYear = new Date().getFullYear()
yearElement.textContent = currentYear

const mainNav = document.querySelector('.main-nav')
const header = document.querySelector('.header')
const btnMobileNav = document.querySelector('.btn-mobile-nav')
const navLink = document.querySelectorAll('.nav-link')

btnMobileNav.addEventListener('click', function () {
    if (header) {
        header.classList.toggle('nav-open')
    } else {
        console.log('Error: Header element not found.')
    }
})

// === Logika Stripe i sprawdzania stanu magazynowego ===
const buyButton = document.querySelector('.buy-btn') // Ta linia pozostaje

// Funkcja do sprawdzania stanu magazynowego na serwerze
async function checkStock() {
    // Sprawdzamy, czy stripe jest zainicjalizowany zanim zaczniemy operacje
    if (!stripe) {
        console.warn('CheckStock: Stripe not yet initialized. Skipping stock check.')
        return
    }

    const product = buyButton.dataset.product
    console.log('CheckStock: Sprawdzam stan magazynowy dla produktu:', product)

    if (!product) {
        console.warn('CheckStock: Nazwa produktu jest pusta. Oczekuję na załadowanie danych.')
        return
    }

    try {
        // TEN FRAGMENT BYŁ JUŻ POPRAWNY
        const response = await fetch('https://ever-bloom-backend.onrender.com/check-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Błąd HTTP: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        console.log('CheckStock: Odpowiedź z serwera:', data)

        if (data.error || data.stock <= 0) {
            buyButton.disabled = true
            buyButton.textContent = 'Sold out'
            console.log('CheckStock: Produkt niedostępny:', data.error || 'Stan magazynowy = 0')
        } else {
            buyButton.disabled = false
            buyButton.textContent = 'Buy now'
            console.log('CheckStock: Dostępny stan magazynowy:', data.stock)
        }
    } catch (error) {
        console.error('CheckStock: Wystąpił błąd podczas sprawdzania stanu magazynowego:', error)
        buyButton.disabled = true
        buyButton.textContent = 'Błąd'
        buyButton.style.backgroundColor = '#dc3545'
    }
}

// Obsługa kliknięcia przycisku "Buy"
buyButton.addEventListener('click', async () => {
    console.log('Clicked Buy: Przycisk kup teraz kliknięty.')
    const product = buyButton.dataset.product
    const price = parseInt(buyButton.dataset.price)

    // Dodatkowe sprawdzenie, czy Stripe jest zainicjalizowany
    if (!stripe) {
        console.error('Clicked Buy: Stripe not initialized. Cannot proceed with checkout.')
        alert('Wystąpił błąd podczas inicjalizacji płatności. Spróbuj odświeżyć stronę.')
        return
    }

    if (!product || !price) {
        console.error('Clicked Buy: Brak danych produktu lub ceny na przycisku.')
        return
    }

    console.log('Clicked Buy: Dane z przycisku:', { product, price })

    try {
        // POPRAWIONO: Prawidłowy adres URL do endpointu /create-checkout-session na Renderze
        const response = await fetch('https://ever-bloom-backend.onrender.com/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product, price }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`Błąd serwera: ${response.status} - ${errorData.error || response.statusText}`)
        }

        const session = await response.json()

        if (session.error) {
            console.error('Clicked Buy: Błąd w sesji Stripe:', session.error)
            alert('Błąd płatności: ' + session.error)
            return
        }

        console.log('Clicked Buy: Sesja Stripe utworzona, przekierowuję do Checkout.')
        stripe.redirectToCheckout({ sessionId: session.id })
    } catch (error) {
        console.error('Clicked Buy: Wystąpił błąd podczas tworzenia sesji Stripe:', error)
        buyButton.textContent = 'Błąd płatności'
        buyButton.disabled = true
        buyButton.style.backgroundColor = '#dc3545'
    }
})

// Funkcja, która pobiera dane produktu z serwera na podstawie ID z URL
async function uploadProduct(idProduct) {
    let combinedProductData = null // Zmienna do przechowywania połączonych danych

    try {
        console.log(`UploadProduct: Próbuję pobrać dane produktu z Airtable dla ID: ${idProduct}`)
        // POPRAWIONO: Prawidłowy adres URL do endpointu /product-by-id na Renderze
        const response = await fetch(`https://ever-bloom-backend.onrender.com/product-by-id?id=${idProduct}`)

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Błąd serwera podczas pobierania produktu: ${response.status} - ${errorText}`)
        }

        const airtableProduct = await response.json()
        console.log('UploadProduct: Dane produktu pobrane z Airtable:', airtableProduct)

        if (!airtableProduct || !airtableProduct.name || airtableProduct.price == null) {
            console.error('UploadProduct: Niekompletne lub brakujące dane produktu z Airtable:', airtableProduct)
            const productNameElement = document.querySelector('.product-name')
            const productDescriptionElement = document.querySelector('.product-description')
            if (productNameElement) productNameElement.textContent = 'Błąd ładowania produktu'
            if (productDescriptionElement) productDescriptionElement.textContent = 'Nie można załadować szczegółów produktu.'
            if (buyButton) {
                buyButton.disabled = true
                buyButton.textContent = 'Błąd'
                buyButton.style.backgroundColor = '#dc3545'
            }
            return null
        }

        // --- Kluczowa zmiana: Łączenie danych z products.js ---
        // Znajdź produkt w lokalnej tablicy `products` (z `products.js`)
        // Pamiętaj: 'products' musi być załadowane globalnie w osobnym skrypcie przed tym plikiem,
        // jeśli 'products.js' to osobny plik, np. <script src="products.js"></script>
        const localProductData =
            typeof products !== 'undefined' ? products.find(p => p.id === parseInt(idProduct, 10)) : null

        if (!localProductData) {
            console.error('UploadProduct: Brak danych produktu w lokalnym pliku products.js dla ID:', idProduct)
            // Nadal możesz wyświetlić dane z Airtable, ale bez obrazków
            combinedProductData = {
                ...airtableProduct,
                img: 'https://placehold.co/600x400/cccccc/000000?text=Brak+obrazka',
                images: [],
            }
        } else {
            // Połącz dane z Airtable z danymi obrazków z products.js
            combinedProductData = {
                ...airtableProduct, // Wszystkie dane z Airtable (ID, nazwa, cena, opis, stock)
                img: localProductData.img, // Obrazek główny z products.js
                images: localProductData.images, // Galeria obrazków z products.js
                description: localProductData.description, // Możesz też nadpisać opis, jeśli jest bardziej szczegółowy w products.js
            }
        }

        console.log('UploadProduct: Połączone dane produktu:', combinedProductData)

        // Aktualizacja DOM za pomocą połączonych danych
        const priceElement = document.querySelector('.product-price')
        if (priceElement) priceElement.textContent = `£${parseFloat(combinedProductData.price).toFixed(2)}`

        const productNameElement = document.querySelector('.product-name')
        if (productNameElement) productNameElement.textContent = combinedProductData.name

        const productDescriptionElement = document.querySelector('.product-description')
        if (productDescriptionElement) productDescriptionElement.textContent = combinedProductData.description

        const productImgElement = document.querySelector('.product-img')
        if (productImgElement) {
            productImgElement.src = combinedProductData.img || 'https://placehold.co/600x400/cccccc/000000?text=Brak+obrazka'
            productImgElement.alt = combinedProductData.name
            productImgElement.onerror = () => {
                console.error('UploadProduct: Nie udało się załadować głównego obrazka:', productImgElement.src)
                productImgElement.src = 'https://placehold.co/600x400/cccccc/000000?text=Błąd+obrazka'
            }
        } else {
            console.warn('UploadProduct: Element .product-img nie znaleziony.')
        }

        // Ustawienie danych na przycisku "Buy"
        if (buyButton) {
            buyButton.dataset.product = combinedProductData.name
            const priceForStripe = Math.round(parseFloat(combinedProductData.price) * 100)
            buyButton.dataset.price = priceForStripe
            console.log('UploadProduct: Ustawiono dane przycisku:', buyButton.dataset.product, buyButton.dataset.price)
        }

        // Wywołaj checkStock() po załadowaniu danych produktu i zainicjowaniu Stripe
        // InitializeStripe już wywołuje checkStock, więc tutaj nie musimy, ale upewnijmy się
        if (stripe) {
            checkStock()
        } else {
            // Jeśli stripe nie jest zainicjowany, poczekaj na jego inicjalizację
            console.log('Stripe not yet initialized after product upload, checkStock will run once it is.')
        }
        return combinedProductData // Zwróć połączone dane
    } catch (error) {
        console.error('UploadProduct: Wystąpił błąd podczas ładowania produktu:', error)
        const productNameElement = document.querySelector('.product-name')
        const productDescriptionElement = document.querySelector('.product-description')
        if (productNameElement) productNameElement.textContent = 'Błąd ładowania'
        if (productDescriptionElement) productDescriptionElement.textContent = 'Spróbuj odświeżyć stronę.'
        if (buyButton) {
            buyButton.disabled = true
            buyButton.textContent = 'Błąd'
            buyButton.style.backgroundColor = '#dc3545'
        }
        return null
    }
}

// Funkcja, która uruchamia proces po załadowaniu DOM
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get('id')

    if (productId) {
        initializeStripe() // Inicjacja Stripe po załadowaniu DOM
        uploadProduct(productId).then(fetchedProduct => {
            if (fetchedProduct) {
                // Przekaż połączone dane (z obrazkami) do imageClick
                imageClick(fetchedProduct)
            } else {
                console.error('DOMContentLoaded: Brak szczegółów produktu do załadowania galerii zdjęć.')
            }
        })
        createImgSub()
    } else {
        console.error('Brak ID produktu w adresie URL.')
        document.querySelector('.product-name').textContent = 'Brak produktu'
        document.querySelector('.product-description').textContent = 'Wybierz produkt ze sklepu.'
        if (buyButton) {
            buyButton.disabled = true
            buyButton.textContent = 'Brak prod.'
            buyButton.style.backgroundColor = '#dc3545'
        }
    }
})

// Funkcja imageClick została zmodyfikowana, aby przyjmować obiekt `product` bezpośrednio (z Airtable)
const imageClick = function (product) {
    const smallImageRow = document.querySelector('.small-img-row')
    const singleImg = document.querySelector('.single-img') // Główny kontener obrazka

    if (!singleImg) {
        console.error('ImageClick: Element .single-img (główny obrazek produktu) nie znaleziony.')
        return
    }

    // Ustaw główny obrazek produktu
    const productImgElement = document.querySelector('.product-img')
    if (productImgElement && product && product.img) {
        productImgElement.src = product.img
        productImgElement.alt = product.name
        productImgElement.onerror = () => {
            console.error('ImageClick: Nie udało się załadować głównego obrazka:', productImgElement.src)
            productImgElement.src = 'https://placehold.co/600x400/cccccc/000000?text=Błąd+obrazka'
        }
    } else {
        console.warn('ImageClick: Główny obrazek produktu lub jego dane są niedostępne dla imageClick. Używam placeholder.')
        if (productImgElement) {
            productImgElement.src = 'https://placehold.co/600x400/cccccc/000000?text=Brak+obrazka'
            productImgElement.alt = 'Brak obrazka'
        }
    }

    // Generowanie małych obrazków pod głównym obrazkiem
    if (smallImageRow && product && product.images && Array.isArray(product.images) && product.images.length > 0) {
        smallImageRow.innerHTML = '' // Wyczyść, aby uniknąć duplikatów
        product.images.forEach(photoUrl => {
            // Iteruj przez URL-e w tablicy product.images
            const createImg = document.createElement('img')
            createImg.src = photoUrl
            createImg.alt = product.name
            createImg.className = 'small-img'
            smallImageRow.append(createImg)
            createImg.onerror = () => {
                console.error('ImageClick: Nie udało się załadować małego obrazka:', createImg.src)
                createImg.src = 'https://placehold.co/100x100/cccccc/000000?text=X' // Mniejszy placeholder
            }
        })

        smallImageRow.addEventListener('click', evt => {
            if (evt.target.tagName === 'IMG') {
                const clickedImg = evt.target
                const newImg = clickedImg.cloneNode(true)
                singleImg.innerHTML = ''
                singleImg.append(newImg)
            }
        })
    } else {
        console.warn('ImageClick: Brak danych dla galerii małych obrazków lub element .small-img-row nie istnieje.')
    }
}

// Funkcja slidera "Zobacz także" - nadal zależy od globalnej tablicy `products` z `products.js`.
const subpageSection = document.querySelector('.subpage')
const subSlider = document.querySelector('.slider')

const createImgSub = function () {
    // Dodano sprawdzenie, czy 'products' jest zdefiniowane, zanim spróbujemy go użyć
    if (typeof products === 'undefined' || !Array.isArray(products) || products.length === 0) {
        console.warn(
            'CreateImgSub: Globalna tablica `products` (z products.js) nie jest dostępna lub jest pusta. Nie można utworzyć slidera "Zobacz także".'
        )
        if (subSlider) {
            subSlider.innerHTML = '<p style="text-align: center; color: #555;">Brak produktów do wyświetlenia w sliderze.</p>'
        }
        return
    }

    if (subSlider) {
        subSlider.innerHTML = ''
        products.forEach((photo, index) => {
            const subImg = document.createElement('img')
            const newIndex = photo.id || index + 1
            subImg.src = photo.img
            subImg.dataset.index = newIndex
            subImg.className = 'slide'
            subSlider.append(subImg)

            subImg.addEventListener('click', () => {
                const clickedIndex = subImg.dataset.index
                window.location.href = `ever-bloom.html?id=${clickedIndex}`
            })
        })
    } else {
        console.warn('CreateImgSub: Element slidera "Zobacz także" nie znaleziony.')
    }
}

createImgSub() // Wywołaj funkcję do tworzenia slidera

// ********************* POPUP IMAGE  **********

const createPopupImage = function () {
    const singleImgDiv = document.querySelector('.single-img')
    const popupImage = document.querySelector('.popup-image')
    const popupImg = popupImage ? popupImage.querySelector('img') : null
    const closePopup = popupImage ? popupImage.querySelector('span') : null

    if (!singleImgDiv || !popupImage || !popupImg || !closePopup) {
        console.warn('createPopupImage: Nie znaleziono wszystkich elementów popup. Funkcja nie będzie działać.')
        return
    }

    const handlePopupActivation = () => {
        const windowWidth = window.innerWidth

        if (windowWidth > 944) {
            singleImgDiv.addEventListener('click', onImageClick)
            closePopup.addEventListener('click', closeImagePopup)
        } else {
            singleImgDiv.removeEventListener('click', onImageClick)
            closePopup.removeEventListener('click', closeImagePopup)
            popupImage.style.display = 'none'
        }
    }

    const onImageClick = evt => {
        const clickedImg = evt.target
        if (clickedImg.tagName === 'IMG') {
            popupImg.src = clickedImg.src
            popupImage.style.display = 'flex'
        }
    }

    const closeImagePopup = () => {
        popupImage.style.display = 'none'
    }

    window.addEventListener('resize', handlePopupActivation)
    handlePopupActivation()
}

createPopupImage()

///// Function Slider (dla małych obrazków w produkcie) //////////////////////////////////////////
let currentIndex = 0

function slider(direction) {
    const slides = document.querySelectorAll('.slider .slide')
    const totalSlides = slides.length

    if (totalSlides === 0) return

    if (direction === 'right') {
        currentIndex = (currentIndex + 1) % totalSlides
    } else if (direction === 'left') {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides
    }

    slides.forEach(slide => {
        slide.style.transform = `translateX(-${currentIndex * 100}%)`
    })
    console.log('Slider: Current slide index:', currentIndex, 'Total slides:', totalSlides)
}

const btnLeft = document.querySelector('.btn-left')
const btnRight = document.querySelector('.btn-right')

if (btnLeft) {
    btnLeft.addEventListener('click', () => slider('left'))
}
if (btnRight) {
    btnRight.addEventListener('click', () => slider('right'))
}

//  EVENT PREVRNT SCROLL FOOTER SOCIAL MEDIA
const noScrollLinks = document.querySelectorAll('.no-scroll-link');
noScrollLinks.forEach(function(link) {
    link.addEventListener('click', function(event) {
        event.preventDefault();
    });
});