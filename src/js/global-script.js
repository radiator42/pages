window.onload = function () {
    
    (function() {
    var humburger = document.querySelector('.hamburger');
    var menuHidden = document.querySelector('.menu-hidden');


    humburger.addEventListener('click', function(e) {

      console.log(e);
        document.body.classList.toggle('body-hidden')
        this.classList.toggle("is-active");
        menuHidden.classList.toggle("animate-hidden-open");
    }, false) 
    
    })();

};