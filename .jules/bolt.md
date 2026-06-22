## 2024-05-18 - Memoizing String Computations for Search Filters
**Learning:** In a React application, frequently typed inputs causing filter functions to re-run on arrays can be an unseen performance bottleneck. Every keystroke triggers an `Array.prototype.filter` or `.map` over the entire catalog. Within these callbacks, constructing strings via concatenation/joining and calling `.toLowerCase()` forces the engine to allocate new memory for strings on every tick.
**Action:** Use a `WeakMap` mapped to the underlying object reference (e.g. `Book` or `CatalogItem`) to cache the pre-computed lowercased search string ("haystack") or lowercased properties. Since it's a `WeakMap`, memory leaks are avoided when the object is garbage collected. Next time, always investigate `.toLowerCase()` or `.join()` inside heavy loops or filter callbacks that react to frequent input changes.

## 2024-05-19 - O(1) Cache Lookups for Constant Arrays
**Learning:** Functions that frequently search through a static array using `.find()` and `.toLowerCase()` (like `COUNTRIES.find(...)`) cause O(N) array iteration and O(N) string memory allocations per call. When these functions are called during renders or loops (e.g. `matchShippingZone` in checkout), they can block the main thread.
**Action:** Always convert static list lookups that rely on computed string comparisons into an O(1) `Map` that is built exactly once at module load time. This completely eliminates both the array traversal overhead and the repeated string allocations.

## 2024-05-20 - Eliminating N+1 Queries in Order History
**Learning:** Iterating through orders or order items and dispatching asynchronous requests sequentially (`await getBook(id)` inside a `for...of` loop) creates a classic N+1 query problem, heavily delaying UI rendering and duplicating API requests when identical items exist across multiple orders.
**Action:** Always batch requests by collecting a unique `Set` of IDs from the dataset and fetching them concurrently using `Promise.all()`. Then, populate a local cache/map to resolve the references synchronously when looping through the original dataset.

## 2024-05-21 - Optimizing Re-Renders in Filter Loops
**Learning:** We observed identical `.toLowerCase()` allocations occurring in `BookCatalog.tsx` when filtering books. I applied a `useMemo` combined with a `WeakMap` to lazily construct and cache the lookup strings.
**Action:** When filtering objects where only the search query changes, cache the object's computed search string (`haystack`) using a `WeakMap` indexed by the object itself.

## 2026-06-18 - Eliminating O(N) Array Lookups in Cart Iteration
**Learning:** Functions that frequently iterate through cart items and search for corresponding catalog items using `.find()` (e.g. `booksCatalog.find(b => b.id === item.id)`) cause O(N*M) complexity (where N is cart items and M is total books). In large catalogs, performing these nested lookups during checkout discount validations and calculations can significantly block the main thread and delay rendering.
**Action:** Always create a `useMemo` map or a local Map keyed by ID (e.g. `Map<string, Book>`) before iterating over cart items to reduce the catalog lookup time to O(1).

## 2024-06-19 - Eliminating O(N*M) Array Lookups in Cart Iteration
**Learning:** In `CartDrawer.tsx`, using `.find()` inside of a `flatMap()` or similar iterations across the entire `cart` to search through the entire `books` catalog creates a massive O(N*M) performance drag, unnecessarily blocking the main thread.
**Action:** When filtering or matching multiple items from a large list against another large list, wrap the list creation inside `useMemo()` and map them into an O(1) `Map` keyed by `id`. Then, reference the cached `Map` instead of re-iterating.

## 2026-06-20 - Eliminating Sequential Firebase Queries in Analytics
**Learning:** Sequential `await` calls for independent Firebase collections (like `analytics`, `orders`, `books`) create a waterfall effect, significantly slowing down the load time of dashboards. This forces the client to wait for each network round-trip to complete before starting the next one.
**Action:** Always fetch independent data concurrently using `Promise.all()` to parallelize network requests and eliminate the waterfall bottleneck.

## 2026-06-21 - Eliminating O(N*M) Array Lookups in Admin Orders
**Learning:** In `Orders.tsx`, finding and filtering operations across an array of IDs during bulk selections triggered O(N) `.find()` searches against the main orders list. Since this happens for every checked item (M selected orders against N total orders), it creates O(N*M) lookups which can delay the render thread significantly on large result sets.
**Action:** Replaced `.find()` lookups with an O(1) `ordersMap` built using `useMemo` that maps each order's ID to its underlying data object. This reduces the selection time complexity to O(N) instead of O(N*M).
