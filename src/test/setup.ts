import '@testing-library/jest-dom/vitest'

// jsdom nema scrollIntoView (koristi se za fokus na prvo pogrešno polje)
Element.prototype.scrollIntoView = () => {}
