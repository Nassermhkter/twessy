// داخل ملف js/main.js
function renderFeaturedProducts(productsToRender) {
    const grid = document.getElementById('featuredProducts');
    if (!grid) return;

    // إذا لم يتم تمرير منتجات، نحاول جلبها من التخزين المحلي
    if (!productsToRender) {
        const saved = localStorage.getItem('twessy_store_products');
        productsToRender = saved ? JSON.parse(saved) : [];
    }

    if (productsToRender.length === 0) {
        grid.innerHTML = '<p>لا توجد منتجات حالياً.</p>';
        return;
    }

    grid.innerHTML = productsToRender.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.category}</p>
            <div class="price">$${product.price}</div>
            <button onclick="addToCart('${product.id}')">أضف إلى السلة</button>
        </div>
    `).join('');
}

// تشغيل الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    renderFeaturedProducts();
});