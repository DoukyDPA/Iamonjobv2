import React, { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implémenter l'envoi du formulaire
    toast.success('Message envoyé ! Nous vous répondrons dans les plus brefs délais.');
    
    // Réinitialiser le formulaire
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="contact-page">
      <div className="container">
        <div className="contact-header">
          <h1>Contactez-nous</h1>
          <p>Une question ? Une suggestion ? Nous sommes là pour vous aider</p>
        </div>

        <div className="contact-content">
          <div className="contact-form-section">
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Sujet</label>
                <input
                  type="text"
                  name="subject"
                  className="form-control"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  name="message"
                  className="form-control"
                  value={formData.message}
                  onChange={handleChange}
                  rows="5"
                  required
                />
              </div>
              
              <button type="submit" className="btn btn-primary">
                <FiSend />
                Envoyer le message
              </button>
            </form>
          </div>
          
          <div className="contact-info-section">
            <h2>Autres moyens de nous contacter</h2>
            
            <div className="contact-info-item">
              <FiMail />
              <div>
                <h4>Email</h4>
                <p>contact@iamonjob.com</p>
              </div>
            </div>
            
            <div className="contact-info-item">
              <FiPhone />
              <div>
                <h4>Téléphone</h4>
                <p>+33 1 23 45 67 89</p>
              </div>
            </div>
            
            <div className="contact-info-item">
              <FiMapPin />
              <div>
                <h4>Adresse</h4>
                <p>CBE Sud 94<br />123 Rue de l'Innovation<br />94000 Créteil</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
