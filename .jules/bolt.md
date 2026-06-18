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
