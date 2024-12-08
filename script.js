
let currentSlide = 0;
const slides = document.querySelectorAll('.slider-content');
const totalSlides = slides.length;
const navDots = document.querySelectorAll('.slider-navigation span');

// Function to toggle the menu
function toggleMenu() {
const menu = document.querySelector('.menu');
const hamburger = document.querySelector('.hamburger');
menu.classList.toggle('active'); // Toggle the 'active' class on the menu
hamburger.classList.toggle('close'); // Add a "close" class to change the hamburger style
}
function showSection(sectionId) {
// Hide all sections first
const sections = document.querySelectorAll('.slider-content');
sections.forEach((section) => {
 section.style.display = 'none'; // Hide the section
});

// Show the selected section
const selectedSection = document.getElementById(sectionId);
selectedSection.style.display = 'flex'; // Display the selected section
}

// Close the menu if screen width is more than 768px
function closeMenuOnResize() {
const menu = document.querySelector('.menu');
const hamburger = document.querySelector('.hamburger');

if (window.innerWidth > 768 && menu.classList.contains('active')) {
 menu.classList.remove('active');
 hamburger.classList.remove('close');
}
}

// Add an event listener for window resize
window.addEventListener('resize', closeMenuOnResize);


function changeSlide(index) {
// Hide all slides first and remove active class
slides.forEach((slide) => {
 slide.style.display = 'none'; // Hide the slide
 slide.classList.remove('active'); // Remove the active class to stop animation
});

// Ensure the index wraps around when reaching the start/end
if (index >= totalSlides) {
 currentSlide = 0; // Go to the first slide
} else if (index < 0) {
 currentSlide = totalSlides - 1; // Go to the last slide
} else {
 currentSlide = index; // Normal index change
}

// Show the selected slide
const selectedSlide = slides[currentSlide];
selectedSlide.style.display = 'flex'; // Make the slide visible
selectedSlide.classList.add('active'); // Add the active class to trigger animation

// Update the navigation dots
updateNavDots();
}


// Preview slide on dot hover
function previewSlide(index) {
const dots = document.querySelectorAll('.slider-navigation span');
dots.forEach((dot) => dot.style.backgroundColor = '#fff');
dots[index].style.backgroundColor = '#f1c40f';
}

// Update navigation dots to reflect the current slide
function updateNavDots() {
navDots.forEach((dot, index) => {
 dot.style.backgroundColor = index === currentSlide ? '#f1c40f' : '#fff';
});
}

// Adding event listeners to slider navigation dots
navDots.forEach((dot, index) => {
dot.addEventListener('click', () => changeSlide(index));
dot.addEventListener('mouseover', () => previewSlide(index));
});

// Check if the device is on a small screen
function isMobileScreen() {
    return window.innerWidth <= 768; // Adjust the threshold as needed
}

// Initialize Hammer.js only for larger screens
function initializeSwipeEvents() {
    const sliderContainer = document.getElementById('slider-container');
    
    // Destroy any existing Hammer instance
    if (sliderContainer.hammerInstance) {
        sliderContainer.hammerInstance.destroy();
        sliderContainer.hammerInstance = null;
    }

    if (!isMobileScreen()) {
        // Add swipe functionality for larger screens
        const hammer = new Hammer(sliderContainer);
        hammer.on('swipeup', function () {
            changeSlide(currentSlide + 1); // Swipe up changes to next slide
        });
        hammer.on('swipedown', function () {
            changeSlide(currentSlide - 1); // Swipe down changes to previous slide
        });

        // Save the Hammer instance to clean up later
        sliderContainer.hammerInstance = hammer;
    }
}

// Initialize mouse events for larger screens
function initializeMouseEvents() {
    const sliderContainer = document.getElementById('slider-container');

    // Remove existing listeners for smaller screens
    if (isMobileScreen()) {
        sliderContainer.removeEventListener('mousedown', handleMouseDown);
        sliderContainer.removeEventListener('mouseup', handleMouseUp);
        return;
    }

    // Add mouse listeners for larger screens
    sliderContainer.addEventListener('mousedown', handleMouseDown);
    sliderContainer.addEventListener('mouseup', handleMouseUp);
}

// Mouse event handlers
let startY = null;
function handleMouseDown(event) {
    startY = event.clientY;
}
function handleMouseUp(event) {
    if (startY === null) return;

    const endY = event.clientY;
    if (startY - endY > 30) {
        changeSlide(currentSlide + 1); // Swipe up
    } else if (endY - startY > 30) {
        changeSlide(currentSlide - 1); // Swipe down
    }
    startY = null;
}

// Initialize touch events for larger screens
function initializeTouchEvents() {
    const sliderContainer = document.getElementById('slider-container');
    let touchStartY = null;

    // Remove touch events for smaller screens
    if (isMobileScreen()) {
        sliderContainer.removeEventListener('touchstart', handleTouchStart);
        sliderContainer.removeEventListener('touchend', handleTouchEnd);
        return;
    }

    // Add touch listeners for larger screens
    sliderContainer.addEventListener('touchstart', handleTouchStart);
    sliderContainer.addEventListener('touchend', handleTouchEnd);

    function handleTouchStart(event) {
        touchStartY = event.touches[0].clientY;
    }

    function handleTouchEnd(event) {
        if (touchStartY === null) return;

        const touchEndY = event.changedTouches[0].clientY;
        if (touchStartY - touchEndY > 30) {
            changeSlide(currentSlide + 1); // Swipe up
        } else if (touchEndY - touchStartY > 30) {
            changeSlide(currentSlide - 1); // Swipe down
        }
        touchStartY = null;
    }
}

// Update swipe and mouse events on screen resize
function onResize() {
    initializeSwipeEvents();
    initializeMouseEvents();
    initializeTouchEvents();
}

// Add resize event listener
window.addEventListener('resize', onResize);

// Initial setup
initializeSwipeEvents();
initializeMouseEvents();
initializeTouchEvents();

// Initialize the first slide
changeSlide(currentSlide);


// Array of all project data
const projectCards = [
{ img: "Media/Project1.png", title: "Campus Explorer(Vr Tour)", description: "Tools: Unity, C#, Vr" , githubLink: "https://github.com/iam-agyenim/Virtual_Campus_Tour"},
{ img: "Media/hand-gesture.jpg", title: "Hand-gesture Robotic arm controller", description: "Tools: Python, OpenCv, XarmAPI, Ufactory X arm",githubLink:"https://github.com/iam-agyenim/Hand-Gesture---Controlled-Robotic-Arm"},
{ img: "Media/image-detector.png", title: "Image Detector", description: "Tools: Python, ImageAi",githubLink:"https://github.com/iam-agyenim/Image-Detector"},
{ img: "Media/Project3.png", title: "Sound project", description: "Tools: Html, Css, Js",githubLink:"https://github.com/iam-agyenim/Sound-web" },
{ img: "Media/Project4.png", title: "Video Project", description: "Tools: Html, Css, Js", githubLink:"https://github.com/marcosnigp1/video-project" },
{ img: "Media/Project5.png", title: "30MFF", description: "Tools: Html, Css, Js", githubLink:"https://github.com/iam-agyenim/30MFF" },
{ img: "Media/password-generator.png", title: "Password Generator", description: "Tools: Python", githubLink:"https://github.com/iam-agyenim/Password_Generator" },
{ img: "Media/tit-4-tat.png", title: "Tit-4-Tat", description: "Tools: C++", githubLink:"https://github.com/iam-agyenim/Tit-4-Tat" },
{ img: "Media/webcal.png", title: "Web Calculator", description: "Tools: Html, Css, Js", githubLink:"https://github.com/iam-agyenim/iam-agyenim.github.io/tree/main/WEbCal" },
// Add more projects as necessary
];


let currentProjectIndex = 0; // Keep track of the current project set

// Function to update the visible projects
function updateProjects() {
const projectCardsDivs = document.querySelectorAll('.project-card');

// Loop through the three visible project cards and update with new content
for (let i = 0; i < 3; i++) {
 const projectIndex = (currentProjectIndex + i) % projectCards.length;
 const project = projectCards[projectIndex];

 const card = projectCardsDivs[i];
 card.querySelector('img').src = project.img;
 card.querySelector('h3').textContent = project.title;
 card.querySelector('p').textContent = project.description;
 const githubLinkElement = card.querySelector('.github-link');
 githubLinkElement.href = project.githubLink; // Set the GitHub link href
 githubLinkElement.textContent = "GitHub"; // Optionally, update the link text if necessary
}

// Update the current project index
currentProjectIndex = (currentProjectIndex + 3) % projectCards.length; // Move to next set of 3, and loop back to 0 when at the end
}

// Start the project update every 20 seconds
setInterval(updateProjects, 20000);

// Initial call to populate the first set of projects
updateProjects();

document.getElementById('contactForm').addEventListener('submit', function(event) {
event.preventDefault(); // Prevent form from reloading the page

// Automatically reset the form when Submit is clicked
this.reset();  // Clears the form fields

// Optionally, you can alert the user that the form was submitted
alert("Message sent successfully!");  // This can be customized or removed as per your need

// Optionally handle actual submission if you want (like with Formspree)
const formData = new FormData(this);

fetch(this.action, {
 method: this.method,
 body: formData
})
.then(response => response.json())
.then(() => {
 // Additional logic on successful submission can be placed here
})
.catch((error) => {
 console.error("Error:", error);
 alert("Something went wrong. Please try again.");
});
});







