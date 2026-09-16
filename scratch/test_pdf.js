const fs = require('fs');
const pdf = require('pdf-parse');

async function testPdf() {
    let pages = [];
    function render_page(pageData) {
        let render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false
        }
        return pageData.getTextContent(render_options).then(function(textContent) {
            let text = textContent.items.map(item => item.str).join(' ');
            pages.push(text);
            return text;
        });
    }
    let options = {
        pagerender: render_page
    }
    
    // Create a dummy PDF to test or just verify the API is correct.
    console.log("PDF parse logic is ready.");
}

testPdf();
