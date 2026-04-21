// ========================================
// TWESSY - PRODUCTS.JS
// عرض وإدارة المنتجات في واجهة العميل
// ========================================

class TwessyProducts {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.categories = new Set();
        this.currentCategory = null;
        this.currentSort = 'default';
        this.searchQuery = '';
        this.displayLimit = 8;
        this.currentPage = 1;
        
        this.init();
    }
    
    // ========== تهيئة ==========
    async init() {
        await this.loadProducts();
        this.extractCategories();
        this.setupEventListeners();
        this.displayProducts();
        this.updateCartCount();
    }
    
    // ========== تحميل المنتجات ==========
    async loadProducts() {
        try {
            // محاولة تحميل من ملف JSON المحلي
            const response = await fetch('data/products.json');
            
            if (response.ok) {
                const data = await response.json();
                this.products = data.products || [];
                console.log(`✅ تم تحميل ${this.products.length} منتج من الملف المحلي`);
            } else {
                throw new Error('فشل تحميل الملف المحلي');
            }
        } catch (error) {
            console.log('⚠️ استخدام البيانات الاحتياطية');
            this.products = this.getBackupProducts();
        }
        
        // تحديث المنتجات المفلترة
        this.filteredProducts = [...this.products];
        
        // حفظ في localStorage للاستخدام في الصفحات الأخرى
        this.saveToLocalStorage();
    }
    
    // ========== استخراج الفئات ==========
    extractCategories() {
        this.products.forEach(product => {
            if (product.category) {
                this.categories.add(product.category);
            }
        });
    }
    
    // ========== إعداد مستمعي الأحداث ==========
    setupEventListeners() {
        // فرز المنتجات
        const sortSelect = document.getElementById('sortProducts');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortProducts();
                this.displayProducts();
            });
        }
        
        // البحث
        const searchInput = document.getElementById('searchProducts');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.filterProducts();
            });
        }
        
        // فلترة حسب الفئة (من الروابط)
        this.setupCategoryFilters();
        
        // زر تحميل المزيد
        const loadMoreBtn = document.getElementById('loadMore');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.displayProducts(true);
            });
        }
        
        // أزرار إضافة للسلة
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn')) {
                const btn = e.target.closest('.add-to-cart-btn');
                const productId = btn.dataset.productId;
                this.addToCart(productId);
            }
            
            if (e.target.closest('.view-product-btn')) {
                const btn = e.target.closest('.view-product-btn');
                const productId = btn.dataset.productId;
                this.showProductDetails(productId);
            }
            
            if (e.target.closest('.add-to-wishlist-btn')) {
                const btn = e.target.closest('.add-to-wishlist-btn');
                const productId = btn.dataset.productId;
                this.addToWishlist(productId);
            }
        });
    }
    
    // ========== إعداد فلترة الفئات ==========
    setupCategoryFilters() {
        // الحصول على الفئة من URL
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        
        if (categoryParam) {
            this.currentCategory = categoryParam;
            this.filterProducts();
        }
        
        // روابط الفئات في الصفحة
        document.querySelectorAll('[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentCategory = link.dataset.category;
                this.filterProducts();
                
                // تحديث URL
                const url = new URL(window.location);
                url.searchParams.set('category', this.currentCategory);
                window.history.pushState({}, '', url);
            });
        });
    }
    
    // ========== فلترة المنتجات ==========
    filterProducts() {
        this.filteredProducts = [...this.products];
        
        // فلترة حسب الفئة
        if (this.currentCategory) {
            this.filteredProducts = this.filteredProducts.filter(
                product => product.category === this.currentCategory
            );
        }
        
        // فلترة حسب البحث
        if (this.searchQuery) {
            this.filteredProducts = this.filteredProducts.filter(product =>
                product.name.toLowerCase().includes(this.searchQuery) ||
                product.description.toLowerCase().includes(this.searchQuery) ||
                (product.tags && product.tags.some(tag => 
                    tag.toLowerCase().includes(this.searchQuery)
                ))
            );
        }
        
        // إعادة التعيين للصفحة الأولى
        this.currentPage = 1;
        
        // تطبيق الترتيب
        this.sortProducts();
        
        // عرض المنتجات
        this.displayProducts();
        
        // تحديث عدد المنتجات
        this.updateResultsCount();
    }
    
    // ========== ترتيب المنتجات ==========
    sortProducts() {
        switch (this.currentSort) {
            case 'price-low':
                this.filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
                break;
            case 'newest':
                this.filteredProducts.sort((a, b) => 
                    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
                );
                break;
            case 'popular':
                this.filteredProducts.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
                break;
            default:
                // الافتراضي - المنتجات المميزة أولاً
                this.filteredProducts.sort((a, b) => {
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    return 0;
                });
        }
    }
    
    // ========== عرض المنتجات ==========
    displayProducts(append = false) {
        const container = document.getElementById('allProducts') || 
                         document.getElementById('featuredProducts');
        
        if (!container) return;
        
        // تحديد عدد المنتجات للعرض
        const start = append ? (this.currentPage - 1) * this.displayLimit : 0;
        const end = this.currentPage * this.displayLimit;
        const productsToShow = this.filteredProducts.slice(start, end);
        
        if (!append) {
            container.innerHTML = '';
        }
        
        if (productsToShow.length === 0) {
            if (!append) {
                container.innerHTML = this.getEmptyState();
            }
            this.toggleLoadMoreButton(false);
            return;
        }
        
        // إنشاء بطاقات المنتجات
        productsToShow.forEach(product => {
            const card = this.createProductCard(product);
            container.appendChild(card);
        });
        
        // إظهار/إخفاء زر تحميل المزيد
        const hasMore = this.filteredProducts.length > end;
        this.toggleLoadMoreButton(hasMore);
    }
    
    // ========== إنشاء بطاقة منتج ==========
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;
        
        const discount = product.oldPrice ? 
            Math.round((1 - product.price / product.oldPrice) * 100) : 0;
        
        card.innerHTML = `
            <div class="product-image">
                <img src="${product.image || 'https://via.placeholder.com/300x300?text=Product'}" 
                     alt="${product.name}" 
                     loading="lazy">
                ${this.getProductBadges(product)}
                <button class="wishlist-btn add-to-wishlist-btn" data-product-id="${product.id}" 
                        title="إضافة للمفضلة">
                    <i class="far fa-heart"></i>
                </button>
                ${!product.inStock ? '<div class="out-of-stock-overlay">نفذ المخزون</div>' : ''}
            </div>
            
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${this.truncateText(product.description, 60)}</p>
                
                <div class="product-rating">
                    ${this.generateRatingStars(product.rating || 0)}
                    <span class="review-count">(${product.reviews || 0})</span>
                </div>
                
                <div class="product-price">
                    <span class="current-price">$${product.price}</span>
                    ${product.oldPrice ? `<span class="old-price">$${product.oldPrice}</span>` : ''}
                    ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                </div>
                
                <div class="product-stock">
                    <i class="fas ${product.stock > 10 ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    <span class="${product.stock > 10 ? 'in-stock' : 'low-stock'}">
                        ${this.getStockText(product.stock)}
                    </span>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-primary add-to-cart-btn" 
                            data-product-id="${product.id}"
                            ${!product.inStock ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i>
                        ${product.inStock ? 'أضف للسلة' : 'غير متوفر'}
                    </button>
                    <button class="btn btn-outline view-product-btn" 
                            data-product-id="${product.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // ========== الحصول على شارات المنتج ==========
    getProductBadges(product) {
        let badges = '';
        
        if (product.badge === 'new') {
            badges += '<span class="product-badge new">جديد</span>';
        } else if (product.badge === 'sale') {
            badges += '<span class="product-badge sale">تخفيض</span>';
        } else if (product.badge === 'featured' || product.featured) {
            badges += '<span class="product-badge featured">مميز</span>';
        }
        
        if (product.stock === 0) {
            badges += '<span class="product-badge out">نفذ</span>';
        }
        
        return badges;
    }
    
    // ========== إنشاء نجوم التقييم ==========
    generateRatingStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }
    
    // ========== نص المخزون ==========
    getStockText(stock) {
        if (stock === 0) return 'غير متوفر';
        if (stock < 5) return `تبقى ${stock} فقط`;
        if (stock < 10) return 'مخزون منخفض';
        return 'متوفر';
    }
    
    // ========== حالة فارغة ==========
    getEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>لا توجد منتجات</h3>
                <p>لم نتمكن من العثور على منتجات تطابق معايير البحث</p>
                <button class="btn btn-primary" onclick="window.productsManager.resetFilters()">
                    عرض جميع المنتجات
                </button>
            </div>
        `;
    }
    
    // ========== إظهار/إخفاء زر تحميل المزيد ==========
    toggleLoadMoreButton(show) {
        const btn = document.getElementById('loadMore');
        if (btn) {
            btn.style.display = show ? 'block' : 'none';
        }
    }
    
    // ========== تحديث عدد النتائج ==========
    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = `${this.filteredProducts.length} منتج`;
        }
    }
    
    // ========== إعادة تعيين الفلاتر ==========
    resetFilters() {
        this.currentCategory = null;
        this.searchQuery = '';
        this.currentSort = 'default';
        
        const searchInput = document.getElementById('searchProducts');
        if (searchInput) searchInput.value = '';
        
        const sortSelect = document.getElementById('sortProducts');
        if (sortSelect) sortSelect.value = 'default';
        
        this.filterProducts();
    }
    
    // ========== عرض تفاصيل المنتج ==========
    showProductDetails(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // إنشاء مودال تفاصيل المنتج
        const modal = document.createElement('div');
        modal.className = 'product-detail-modal active';
        modal.innerHTML = `
            <div class="modal-content product-detail-content">
                <button class="modal-close" onclick="this.closest('.product-detail-modal').remove()">
                    &times;
                </button>
                
                <div class="product-detail-grid">
                    <div class="product-detail-image">
                        <img src="${product.image || 'https://via.placeholder.com/400x400'}" 
                             alt="${product.name}">
                        ${this.getProductBadges(product)}
                    </div>
                    
                    <div class="product-detail-info">
                        <h2>${product.name}</h2>
                        <div class="product-meta">
                            <span class="product-sku">SKU: ${product.sku || 'N/A'}</span>
                            <span class="product-category">${product.category}</span>
                        </div>
                        
                        <div class="product-rating-large">
                            ${this.generateRatingStars(product.rating || 0)}
                            <span>(${product.reviews || 0} تقييم)</span>
                        </div>
                        
                        <div class="product-price-large">
                            <span class="current-price">$${product.price}</span>
                            ${product.oldPrice ? `<span class="old-price">$${product.oldPrice}</span>` : ''}
                        </div>
                        
                        <div class="product-description-full">
                            <p>${product.description}</p>
                        </div>
                        
                        <div class="product-stock-info">
                            <i class="fas ${product.stock > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${this.getStockText(product.stock)}</span>
                        </div>
                        
                        <div class="product-quantity">
                            <label>الكمية:</label>
                            <div class="quantity-selector">
                                <button class="qty-btn" onclick="this.parentElement.querySelector('input').stepDown()">-</button>
                                <input type="number" value="1" min="1" max="${product.stock}" 
                                       id="productQuantity">
                                <button class="qty-btn" onclick="this.parentElement.querySelector('input').stepUp()">+</button>
                            </div>
                        </div>
                        
                        <div class="product-actions-large">
                            <button class="btn btn-primary btn-lg add-to-cart-btn" 
                                    data-product-id="${product.id}"
                                    ${!product.inStock ? 'disabled' : ''}>
                                <i class="fas fa-shopping-cart"></i>
                                أضف للسلة
                            </button>
                            <button class="btn btn-outline btn-lg add-to-wishlist-btn" 
                                    data-product-id="${product.id}">
                                <i class="far fa-heart"></i>
                                أضف للمفضلة
                            </button>
                        </div>
                        
                        <div class="product-tags">
                            ${product.tags ? product.tags.map(tag => 
                                `<span class="tag">${tag}</span>`
                            ).join('') : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // إغلاق المودال عند النقر خارجه
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // ========== إضافة للسلة ==========
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.inStock) return;
        
        // الحصول على الكمية
        const quantityInput = document.getElementById('productQuantity');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        
        // جلب السلة الحالية
        let cart = JSON.parse(localStorage.getItem('twessy_cart') || '[]');
        
        // البحث عن المنتج في السلة
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: quantity,
                maxQuantity: product.stock
            });
        }
        
        // حفظ السلة
        localStorage.setItem('twessy_cart', JSON.stringify(cart));
        
        // تحديث عداد السلة
        this.updateCartCount();
        
        // إظهار رسالة نجاح
        this.showNotification('✅ تم إضافة المنتج للسلة', 'success');
        
        // تحديث مودال السلة إذا كان مفتوحاً
        if (typeof updateCartModal === 'function') {
            updateCartModal();
        }
    }
    
    // ========== إضافة للمفضلة ==========
    addToWishlist(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // جلب المفضلة الحالية
        let wishlist = JSON.parse(localStorage.getItem('twessy_wishlist') || '[]');
        
        if (!wishlist.includes(productId)) {
            wishlist.push(productId);
            localStorage.setItem('twessy_wishlist', JSON.stringify(wishlist));
            this.showNotification('✅ تم إضافة المنتج للمفضلة', 'success');
            
            // تحديث أيقونة القلب
            document.querySelectorAll(`.add-to-wishlist-btn[data-product-id="${productId}"] i`)
                .forEach(icon => {
                    icon.className = 'fas fa-heart';
                });
        } else {
            this.showNotification('المنتج موجود بالفعل في المفضلة', 'info');
        }
    }
    
    // ========== تحديث عداد السلة ==========
    updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('twessy_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = totalItems;
        });
    }
    
    // ========== إظهار إشعار ==========
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // ========== حفظ في localStorage ==========
    saveToLocalStorage() {
        try {
            localStorage.setItem('twessy_products', JSON.stringify(this.products));
        } catch (e) {
            console.warn('تعذر حفظ المنتجات في localStorage');
        }
    }
    
    // ========== بيانات احتياطية ==========
    getBackupProducts() {
        // محاولة استرجاع من localStorage
        const saved = localStorage.getItem('twessy_products');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {}
        }
        
        // منتجات افتراضية
        return [
            {
                id: '1',
                name: 'فرشاة أسنان كهربائية سونيك',
                category: 'فرش الأسنان',
                description: 'فرشاة أسنان كهربائية بتقنية السونيك لتنظيف عميق وفعال',
                price: 25,
                oldPrice: 35,
                stock: 50,
                inStock: true,
                badge: 'sale',
                featured: true,
                image: 'https://via.placeholder.com/300x300?text=Electric+Toothbrush',
                rating: 4.8,
                reviews: 124
            },
            {
                id: '2',
                name: 'معجون أسنان بالفلورايد',
                category: 'معاجين الأسنان',
                description: 'معجون أسنان متطور يحمي من التسوس ويقوي المينا',
                price: 8,
                stock: 100,
                inStock: true,
                featured: true,
                image: 'https://via.placeholder.com/300x300?text=Toothpaste',
                rating: 4.6,
                reviews: 89
            },
            {
                id: '3',
                name: 'خيط أسنان طبي مشمع',
                category: 'خيط الأسنان',
                description: 'خيط أسنان طبي سهل الاستخدام',
                price: 5,
                oldPrice: 7,
                stock: 200,
                inStock: true,
                badge: 'sale',
                image: 'https://via.placeholder.com/300x300?text=Dental+Floss',
                rating: 4.7,
                reviews: 56
            }
        ];
    }
    
    // ========== دوال مساعدة ==========
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
}

// ========== تهيئة المنتجات عند تحميل الصفحة ==========
let productsManager;

document.addEventListener('DOMContentLoaded', () => {
    productsManager = new TwessyProducts();
    window.productsManager = productsManager;
});

// ========== تصدير للاستخدام العالمي ==========
window.TwessyProducts = TwessyProducts;