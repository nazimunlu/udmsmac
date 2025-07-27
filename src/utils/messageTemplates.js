// Default message templates
const defaultTemplates = {
    late_payment: {
        name: 'Late Payment Message',
        content: 'Sayın {studentName}, vade tarihi {dueDate} olan {amount} tutarında ödenmemiş {installmentCount} adet taksitiniz bulunmaktadır. Ödeme yaptıysanız lütfen bizimle iletişime geçin. Saygılarımızla. - Özel Ünlü Dil İngilizce Kursu Yönetimi.',
        type: 'late_payment'
    },
    absence: {
        name: 'Student Absence Message',
        content: 'Sayın velimiz, öğrencimiz {studentName}, {lessonDate} tarihindeki dersine katılmamıştır. Saygılarımızla. - Özel Ünlü Dil İngilizce Kursu Yönetimi.',
        type: 'absence'
    }
};

// Get message templates from localStorage or return defaults
export const getMessageTemplates = () => {
    try {
        const savedTemplates = localStorage.getItem('messageTemplates');
        if (savedTemplates) {
            return JSON.parse(savedTemplates);
        }
    } catch (error) {
        console.error('Error loading message templates:', error);
    }
    return defaultTemplates;
};

// Get a specific template by type
export const getTemplate = (type) => {
    const templates = getMessageTemplates();
    return templates[type] || defaultTemplates[type];
};

// Generate a message using a template and data
export const generateMessage = (templateType, data) => {
    const template = getTemplate(templateType);
    if (!template) {
        console.error(`Template not found for type: ${templateType}`);
        return '';
    }

    let message = template.content;

    // Replace placeholders with actual data
    Object.keys(data).forEach(key => {
        const placeholder = `{${key}}`;
        message = message.replace(new RegExp(placeholder, 'g'), data[key] || '');
    });

    return message;
};

// Save templates to localStorage
export const saveMessageTemplates = (templates) => {
    try {
        localStorage.setItem('messageTemplates', JSON.stringify(templates));
        return true;
    } catch (error) {
        console.error('Error saving message templates:', error);
        return false;
    }
};

// Update a specific template
export const updateTemplate = (type, template) => {
    const templates = getMessageTemplates();
    templates[type] = template;
    return saveMessageTemplates(templates);
}; 