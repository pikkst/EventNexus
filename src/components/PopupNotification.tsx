import React from 'react';
import './popup-notification.css'; // Updated to new styles

const PopupNotification = ({ title, message, onClose }) => {
    return (
        <div className="popup-notification show">
            <button className="close-btn" onClick={onClose}>×</button>
            <h4>{title}</h4>
            <p>{message}</p>
        </div>
    );
};

export default PopupNotification;