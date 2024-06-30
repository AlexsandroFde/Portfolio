document.querySelectorAll('section div ul a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        window.scrollTo({
            top: targetElement.offsetTop + 200,
            behavior: 'smooth'
        });
    });
});
document.querySelectorAll('.toggle-icon').forEach(icon => {
    icon.addEventListener('click', function() {
        const content = this.parentElement.nextElementSibling;
        content.classList.toggle('show');
        this.classList.toggle('rotate');
    });
});
document.querySelectorAll('.menu-icon').forEach(icon => {
    icon.addEventListener('click', function() {
        const content = this.parentElement.nextElementSibling;
        content.classList.toggle('show');
    });
});
function showSection(sectionId) {
    document.getElementById('curriculo').style.display = 'none';
    document.getElementById('portfolio').style.display = 'none';

    document.getElementById(sectionId).style.display = 'block';

    const navLinks = document.querySelectorAll('#nav-links li');
    navLinks.forEach(link => link.classList.remove('select'));

    if (sectionId === 'curriculo') {
        document.querySelector('#nav-links li:nth-child(1)').classList.add('select');
    } else if (sectionId === 'portfolio') {
        document.querySelector('#nav-links li:nth-child(2)').classList.add('select');
    }
}
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarIcons = document.querySelectorAll('.sidebar-icon');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    sidebarIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            sidebarOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        });
    });

    document.addEventListener('click', function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickInsideSidebarIcon = Array.from(sidebarIcons).some(icon => icon.contains(event.target));

        if (!isClickInsideSidebar && !isClickInsideSidebarIcon) {
            sidebar.classList.remove('open');
            sidebarOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.0)';
        }
    });
});
