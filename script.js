(() => {
	const GRID_ID = "product-grid";
	const SEARCH_ID = "search";
	const ADD_SAMPLE_ID = "add-sample";

	const CARD_SELECTOR = ".product-card";
	const BTN_ADD_CART_SELECTOR = ".btn-add-cart";
	const CARD_ADDED_CLASS = "added-to-cart";
	const BTN_ADDED_CLASS = "added";
	const HIDDEN_ATTR = "data-hidden";

	const CARD_IMAGE_WRAP_SELECTOR = ".card-image-wrap";

	const RESPONSIVE_IMAGE_WIDTHS = [320, 480, 640, 800, 960, 1200];
	const RESPONSIVE_IMAGE_SIZES =
		"(min-width: 1024px) 360px, (min-width: 768px) 45vw, 92vw";

	const stripUnsplashSizeParams = (url) => {
		if (typeof url !== "string" || !url) return "";
		let cleaned = url.replace(/([?&])(w|h)=\d+/g, "");
		cleaned = cleaned.replace(/\?&/, "?").replace(/&&/g, "&").replace(/[?&]$/, "");
		return cleaned;
	};

	const buildUnsplashSizedUrl = (baseUrl, size) => {
		const cleaned = stripUnsplashSizeParams(baseUrl);
		if (!cleaned) return "";
		const joiner = cleaned.includes("?") ? "&" : "?";
		return `${cleaned}${joiner}w=${size}&h=${size}`;
	};

	const buildUnsplashSrcset = (baseUrl) =>
		RESPONSIVE_IMAGE_WIDTHS.map(
			(w) => `${buildUnsplashSizedUrl(baseUrl, w)} ${w}w`,
		).join(", ");

	const scheduleIdle = (fn) => {
		if (typeof window.requestIdleCallback === "function") {
			window.requestIdleCallback(fn, { timeout: 1500 });
			return;
		}
		window.setTimeout(fn, 150);
	};

	const preloaded = new Set();
	const preloadImage = (maybeBaseUrl) => {
		const baseUrl = stripUnsplashSizeParams(maybeBaseUrl);
		if (!baseUrl || preloaded.has(baseUrl)) return;
		preloaded.add(baseUrl);

		scheduleIdle(() => {
			try {
				const img = new Image();
				img.decoding = "async";
				if ("fetchPriority" in img) img.fetchPriority = "low";

				img.setAttribute("sizes", RESPONSIVE_IMAGE_SIZES);
				img.setAttribute("srcset", buildUnsplashSrcset(baseUrl));
				img.src = buildUnsplashSizedUrl(baseUrl, 320) || baseUrl;
			} catch {}
		});
	};

	const setCardLoading = (card, isLoading) => {
		const wrap = card?.querySelector(".card-image-wrap");
		if (!wrap) return;
		wrap.classList.toggle("is-loading", isLoading);
	};

	const setResponsiveCardImage = (imgEl, maybeBaseUrl) => {
		const baseUrl = stripUnsplashSizeParams(maybeBaseUrl);
		if (!baseUrl) return;
		imgEl.decoding = "async";
		imgEl.setAttribute("sizes", RESPONSIVE_IMAGE_SIZES);
		imgEl.setAttribute("srcset", buildUnsplashSrcset(baseUrl));
		imgEl.src = buildUnsplashSizedUrl(baseUrl, 320) || baseUrl;
	};

	const SAMPLE_PRODUCT = {
		title: "Sample Product",
		description:
			"Dynamically added sample product.",
		price: "$19.99",
		images: [
			"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&q=75&fit=crop",
			"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&q=75&fit=crop",
			"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&q=75&fit=crop",
		],
	};

	const grid = document.getElementById(GRID_ID);
	const searchInput = document.getElementById(SEARCH_ID);
	const addSampleBtn = document.getElementById(ADD_SAMPLE_ID);
	const themeToggle = document.getElementById("theme-toggle");
	const themeIconSun = document.getElementById("theme-icon-sun");
	const themeIconMoon = document.getElementById("theme-icon-moon");
	const noResultsMessage = document.createElement("div");
	noResultsMessage.id = "no-results-message";
	noResultsMessage.className = "no-results-message";
	noResultsMessage.setAttribute("role", "status");
	noResultsMessage.setAttribute("aria-live", "polite");
	noResultsMessage.hidden = true;
	noResultsMessage.textContent = "No results. Try a different search.";

	if (!grid || !searchInput || !addSampleBtn) return;

	if (themeToggle && themeIconSun && themeIconMoon) {
		const THEME_KEY = "theme";
		const updateThemeUI = () => {
			const theme = document.documentElement.getAttribute("data-theme") || "";
			themeIconSun.hidden = theme !== "dark";
			themeIconMoon.hidden = theme !== "light";
		};
		themeToggle.addEventListener("click", () => {
			const current = document.documentElement.getAttribute("data-theme") || "";
			const next = current === "dark" ? "light" : "dark";
			document.documentElement.setAttribute("data-theme", next);
			try {
				localStorage.setItem(THEME_KEY, next);
			} catch {}
			updateThemeUI();
		});
		updateThemeUI();
	}

	grid.addEventListener(
		"load",
		(e) => {
			const img = e.target;
			if (!(img instanceof HTMLImageElement)) return;
			if (!img.classList.contains("card-image")) return;
			const card = img.closest(CARD_SELECTOR);
			if (!card) return;
			setCardLoading(card, false);
		},
		true,
	);

	grid.addEventListener(
		"error",
		(e) => {
			const img = e.target;
			if (!(img instanceof HTMLImageElement)) return;
			if (!img.classList.contains("card-image")) return;
			const card = img.closest(CARD_SELECTOR);
			if (!card) return;
			setCardLoading(card, false);
		},
		true,
	);

	const cycleCardImage = (card) => {
		const imagesJson = card.getAttribute("data-images");
		if (!imagesJson) return;
		let urls;
		try {
			urls = JSON.parse(imagesJson);
		} catch {
			return;
		}
		if (!Array.isArray(urls) || urls.length === 0) return;
		const img = card.querySelector(".card-image");
		if (!img) return;
		const current = Number(card.dataset.imageIndex ?? 0);
		const next = (current + 1) % urls.length;
		card.dataset.imageIndex = String(next);
		setCardLoading(card, true);
		setResponsiveCardImage(img, urls[next]);
		card.querySelectorAll(".card-image-dot").forEach((dot, i) => {
			dot.classList.toggle("card-image-dot--active", i === next);
		});

		const afterNext = urls[(next + 1) % urls.length];
		if (afterNext) preloadImage(afterNext);
	};

	const addImageDots = (card) => {
		const imagesJson = card.getAttribute("data-images");
		if (!imagesJson) return;
		let urls;
		try {
			urls = JSON.parse(imagesJson);
		} catch {
			return;
		}
		if (!Array.isArray(urls) || urls.length < 2) return;
		const wrap = card.querySelector(".card-image-wrap");
		if (!wrap || wrap.querySelector(".card-image-dots")) return;
		const dotsEl = document.createElement("div");
		dotsEl.className = "card-image-dots";
		dotsEl.setAttribute("aria-hidden", "true");
		const index = Number(card.dataset.imageIndex ?? 0);
		for (let i = 0; i < urls.length; i++) {
			const dot = document.createElement("span");
			dot.className = "card-image-dot";
			if (i === index) dot.classList.add("card-image-dot--active");
			dotsEl.appendChild(dot);
		}
		wrap.appendChild(dotsEl);
	};

	const initImageDots = () => {
		grid.querySelectorAll(CARD_SELECTOR).forEach(addImageDots);
	};
	initImageDots();

	grid.appendChild(noResultsMessage);

	grid.querySelectorAll(CARD_SELECTOR).forEach((card) => {
		const img = card.querySelector(".card-image");
		if (!img) return;
		const imagesJson = card.getAttribute("data-images");
		if (!imagesJson) return;
		let urls;
		try {
			urls = JSON.parse(imagesJson);
		} catch {
			return;
		}
		if (!Array.isArray(urls) || urls.length === 0) return;
		const index = Number(card.dataset.imageIndex ?? 0);
		setResponsiveCardImage(img, urls[index] ?? urls[0]);
		urls.forEach((u, i) => {
			if (i !== index) preloadImage(u);
		});
	});

	grid.addEventListener("click", (e) => {
		const wrap = e.target.closest(CARD_IMAGE_WRAP_SELECTOR);
		if (wrap) {
			const card = wrap.closest(CARD_SELECTOR);
			if (card) {
				cycleCardImage(card);
				return;
			}
		}

		const btn = e.target.closest(BTN_ADD_CART_SELECTOR);
		if (!btn) return;

		const card = btn.closest(CARD_SELECTOR);
		if (!card) return;

		const isAdded = btn.classList.toggle(BTN_ADDED_CLASS);
		card.classList.toggle(CARD_ADDED_CLASS, isAdded);
		btn.textContent = isAdded ? "Added" : "Add to Cart";
	});

	const applySearchFilter = () => {
		const query = (searchInput?.value ?? "").trim().toLowerCase();
		const cards = grid.querySelectorAll(CARD_SELECTOR);
		let matchCount = 0;
		cards.forEach((card) => {
			const title = (card.getAttribute("data-title") ?? "").toLowerCase();
			const match = !query || title.includes(query);
			card.setAttribute(HIDDEN_ATTR, match ? "false" : "true");
			if (match) matchCount++;
		});

		const showNoResults = Boolean(query) && matchCount === 0;
		noResultsMessage.hidden = !showNoResults;
		noResultsMessage.textContent = showNoResults
			? `No products match “${searchInput.value.trim()}”. Try a different search.`
			: "No results. Try a different search.";
	};

	searchInput.addEventListener("input", applySearchFilter);

	const createProductCard = (product) => {
		const article = document.createElement("article");
		article.className = "product-card";
		article.setAttribute("data-title", product.title);
		article.setAttribute(HIDDEN_ATTR, "false");
		article.setAttribute("role", "listitem");

		const wrap = document.createElement("div");
		wrap.className = "card-image-wrap";

		const images = product.images ?? (product.image ? [product.image] : []);
		const baseImages = images.map(stripUnsplashSizeParams);
		article.setAttribute("data-images", JSON.stringify(baseImages));

		const img = document.createElement("img");
		setResponsiveCardImage(img, baseImages[0] ?? "");
		img.alt = "";
		img.className = "card-image";
		img.width = 600;
		img.height = 600;
		img.loading = "lazy";
		wrap.appendChild(img);

		const body = document.createElement("div");
		body.className = "card-body";

		const titleEl = document.createElement("h2");
		titleEl.className = "card-title";
		titleEl.textContent = product.title;
		body.appendChild(titleEl);

		const desc = document.createElement("p");
		desc.className = "card-description";
		desc.textContent = product.description;
		body.appendChild(desc);

		const price = document.createElement("p");
		price.className = "card-price";
		price.textContent = product.price;
		body.appendChild(price);

		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "btn-add-cart";
		btn.textContent = "Add to Cart";
		body.appendChild(btn);

		article.appendChild(wrap);
		article.appendChild(body);
		addImageDots(article);
		baseImages.forEach(preloadImage);
		return article;
	};

	addSampleBtn.addEventListener("click", () => {
		const card = createProductCard(SAMPLE_PRODUCT);
		grid.appendChild(card);
		applySearchFilter();
	});
})();
