// FunctionCreateProductCard dynamically.

const functionCreateProductCard = function () {
	const productsContainer = document.querySelector('.container-grid')

	if (productsContainer) {
		products.forEach((product, index) => {
			const card = document.createElement('figure')
			card.className = 'card'
			productsContainer.append(card)

			const imgBox = document.createElement('div')
			imgBox.className = 'img-box'
			card.append(imgBox)

			const img = document.createElement('img')
			const imageIndex = index + 1
			img.src = product.img
			img.alt = product.altDescription
			img.className = 'card-img'
			img.dataset.index = imageIndex
			imgBox.append(img)

			// Handling clicking the image card
			img.addEventListener('click', () => {
				const clickedImg = img.dataset.index
				window.open(`ever-bloom.html?id=${clickedImg}`)
			})

			// Creating card elements
			const cardInfo = document.createElement('figcaption')
			cardInfo.className = 'card-info'
			card.appendChild(cardInfo)

			const productName = document.createElement('h3')
			productName.className = 'product-name'
			productName.textContent = product.name
			cardInfo.append(productName)

			const priceBox = document.createElement('div')
			priceBox.className = 'price-box'
			cardInfo.append(priceBox)

			const priceBoxInfo = document.createElement('div')
			priceBoxInfo.className = 'price-box-info'
			priceBox.append(priceBoxInfo)

			const productPriceText = document.createElement('span')
			productPriceText.className = 'product-price-text'
			productPriceText.textContent = product.opis
			priceBoxInfo.append(productPriceText)

			const productPrice = document.createElement('p')
			productPrice.className = 'product-price'
			productPrice.textContent = product.price
			priceBoxInfo.append(productPrice)

			const productInfo = document.createElement('button')
			const newIndex = index + 1
			productInfo.className = 'more-info'
			productInfo.textContent = 'Buy'
			productInfo.dataset.index = newIndex
			priceBox.append(productInfo)

			// Handling clicking the "more info" button
			productInfo.addEventListener('click', () => {
				const clickedIndex = productInfo.dataset.index
				window.open(`ever-bloom.html?id=${clickedIndex}`, '_self')
			})
		})
	}
}

functionCreateProductCard()

// Gallery
const photographs = [
	'img/everbloom--img/Ever-Bloom--hero.05.jpg',
	'img/everbloom--img/Ever-Bloom--hero.06.jpg',
	'img/everbloom--img/Ever-Bloom--hero.11.jpg',
	'img/everbloom--img/Ever-Bloom--hero.12.jpg',
	'img/everbloom--img/Ever-Bloom--hero.13.jpg',
	'img/everbloom--img/Ever-Bloom--hero.14.jpg',
	'img/everbloom--img/Ever-Bloom--hero.15.jpg',
	'img/everbloom--img/Ever-Bloom--hero.15.jpg',
	'img/everbloom--img/Ever-Bloom--hero.17.jpg',
	'img/everbloom--img/Ever-Bloom--hero.18.jpg',
	'img/everbloom--img/Ever-Bloom--hero.19.jpg',
	'img/everbloom--img/Ever-Bloom--hero.20.jpg',
]

const gallery = document.querySelector('.gallery-img')
photographs.forEach(photo => {
	const galleryImg = document.createElement('img')
	galleryImg.src = photo
	galleryImg.alt =
		'Gallery photo. A beautifully crafted item from EverBloom, showcasing our passion for creativity and sustainability. Each piece, from intricate jewelry to bespoke home decor, is handcrafted with love using sustainable materials to inspire joy and individuality.'
	galleryImg.loading = 'lazy'
	gallery.append(galleryImg)
})

// important
// Initialize EmailJS

document.querySelector('#contact-form').addEventListener('submit', function (event) {
	event.preventDefault() // Prevents the page from refreshing

	let params = {
		name: document.querySelector('#name').value,
		subject: document.querySelector('#subject').value,
		email_id: document.querySelector('#email').value,
		message: document.querySelector('#message').value,
	}

	emailjs
		.send('service_w6ai9ob', 'template_9pmysle', params)
		.then(function (res) {
			alert('Success! Status: ' + res.status)
			document.getElementById('contact-form').reset()
		})
		.catch(function (error) {
			alert('Error occurred: ' + error)
		})
})
// Copyright current year;
const yearElement = document.querySelector('.year')
const currentYear = new Date().getFullYear()
yearElement.textContent = currentYear

// Mobile navigation
const mainNav = document.querySelector('.main-nav')
const header = document.querySelector('.header')
const btnMobileNav = document.querySelector('.btn-mobile-nav')
const headerText = document.querySelector('.header-container--text')
const navLinks = document.querySelectorAll('.nav-link')

btnMobileNav.addEventListener('click', function () {
	header.classList.toggle('nav-open')
	headerText.classList.toggle('hidden')
})

navLinks.forEach(function (link) {
	link.addEventListener('click', function () {
		header.classList.toggle('nav-open')
		headerText.classList.toggle('hidden')
	})
})

const heroSectionEl = document.querySelector('.hero')
const observer = new IntersectionObserver(
	function (entries) {
		const ent = entries[0]
		if (ent.isIntersecting === false) {
			document.body.classList.add('sticky')
		}

		if (ent.isIntersecting) {
			document.body.classList.remove('sticky')
		}
	},
	{
		root: null,
		threshold: 0,
		rootMargin: '-80px',
	}
)
observer.observe(heroSectionEl)

//  EVENT PREVRNT SCROLL FOOTER SOCIAL MEDIA
const noScrollLinks = document.querySelectorAll('.no-scroll-link')
noScrollLinks.forEach(function (link) {
	link.addEventListener('click', function (event) {
		event.preventDefault()
	})
})
