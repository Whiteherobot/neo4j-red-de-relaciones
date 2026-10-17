document.getElementById('person-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const person = {
        name: document.getElementById('name').value,
        nickname: document.getElementById('nickname').value,
        email: document.getElementById('email').value,
        city: document.getElementById('city').value,
        country: document.getElementById('country').value
    };

    const session = window.neo4jSession;
    session.run(
        'MATCH (p:Person {nickname: $nickname}) RETURN p',
        { nickname: person.nickname }
    )
    .then(result => {
        if (result.records.length > 0) {
            alert('Este nickname ya está registrado.');
            return;
        }

        registerPerson(person);
    })
    .catch(error => {
        console.error('Error al verificar existencia de nickname:', error);
    });
});



document.getElementById('relationship-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const relationship = {
        person1: document.getElementById('person1').value,
        person2: document.getElementById('person2').value,
        type: document.getElementById('type').value,
        frequency: document.getElementById('frequency').value,
        importance: document.getElementById('importance').value
    };
    registerRelationship(relationship);
});




// Función para registrar una relación (añadir verificación para evitar relaciones consigo mismo)
function registerRelationship(relationship) {
    if (relationship.person1 === relationship.person2) {
        alert('No se puede crear una relación consigo mismo.');
        return;
    }

    const session = window.neo4jSession;
    session.run(
        'MATCH (a:Person {name: $person1})-[r:RELATIONSHIP {type: $type}]->(b:Person {name: $person2}) RETURN r',
        {
            person1: relationship.person1,
            person2: relationship.person2,
            type: relationship.type
        }
    )
    .then(result => {
        if (result.records.length > 0) {
            alert('Esta relación ya existe.');
            return;
        }

        session.writeTransaction(tx => {
            return tx.run(
                'MATCH (a:Person {name: $person1}), (b:Person {name: $person2}) ' +
                'CREATE (a)-[r:RELATIONSHIP {type: $type, frequency: $frequency, importance: $importance}]->(b) ' +
                'RETURN r',
                {
                    person1: relationship.person1,
                    person2: relationship.person2,
                    type: relationship.type,
                    frequency: relationship.frequency,
                    importance: relationship.importance
                }
            );
        })
        .then(result => {
            console.log('Relación registrada:', result.records[0].get('r'));
            updateRelationshipList();

            // Limpiar los campos del formulario
            document.getElementById('relationship-form').reset();
        })
        .catch(error => {
            console.error('Error al registrar relación:', error);
        });
    })
    .catch(error => {
        console.error('Error al verificar existencia de relación:', error);
    });
}

function deletePerson(name, nickname) {
    const session = window.neo4jSession;
    session.writeTransaction(tx => {
        return tx.run(
            'MATCH (p:Person {name: $name, nickname: $nickname}) DELETE p',
            { name: name, nickname: nickname }
        );
    })
    .then(result => {
        console.log('Persona eliminada:', result);
        updatePersonList(); // Actualizar la lista de personas
        loadPersonOptions(); // Actualizar opciones de los selectores
    })
    .catch(error => {
        console.error('Error al eliminar persona:', error);
    });
}


function updatePersonList() {
    const session = window.neo4jSession;
    session.run('MATCH (p:Person) RETURN p')
    .then(result => {
        const personsList = document.getElementById('persons-list');
        personsList.innerHTML = '';
        result.records.forEach(record => {
            const person = record.get('p').properties;
            const personItem = document.createElement('div');
            personItem.textContent = `${person.name} (${person.nickname}) - ${person.email}, ${person.city}, ${person.country}`;
            personsList.appendChild(personItem);
        });
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const nickname = this.getAttribute('data-nickname');
                deletePerson(name, nickname);
            });
        });
    })
    .catch(error => {
        console.error('Error al obtener lista de personas:', error);
    });
}



// Agregar esta función para cargar las opciones en los selectores de "Persona 1" y "Persona 2"


// Llamar a esta función después de registrar una persona para actualizar los selectores
function registerPerson(person) {
    const session = window.neo4jSession;
    session.run(
        'CREATE (p:Person {name: $name, nickname: $nickname, email: $email, city: $city, country: $country}) RETURN p',
        {
            name: person.name,
            nickname: person.nickname,
            email: person.email,
            city: person.city,
            country: person.country
        }
    )
    .then(result => {
        console.log('Persona registrada:', result.records[0].get('p'));
        updatePersonList();
        loadPersonOptions(); // Cargar opciones después de registrar una persona
        document.getElementById('person-form').reset();
    })
    .catch(error => {
        console.error('Error al registrar persona:', error);
    });
}
// Función para actualizar la lista de personas en la tabla
function updatePersonList() {
    const session = window.neo4jSession;
    session.run('MATCH (p:Person) RETURN p')
    .then(result => {
        const personsTableBody = document.querySelector('#persons-table tbody');
        personsTableBody.innerHTML = ''; // Limpiar la tabla antes de agregar nuevas filas
        result.records.forEach(record => {
            const person = record.get('p').properties;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${person.name}</td>
                <td>${person.nickname}</td>
                <td>${person.email}</td>
                <td>${person.city}</td>
                <td>${person.country}</td>
                <td><button class="delete-btn" data-name="${person.name}" data-nickname="${person.nickname}">Eliminar</button></td>
            `;
            personsTableBody.appendChild(row);
        });

        // Añadir eventos de clic a los botones de eliminar dentro de esta función
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const nickname = this.getAttribute('data-nickname');
                deletePerson(name, nickname);
            });
        });
    })
    .catch(error => {
        console.error('Error al obtener lista de personas:', error);
    });
}


// Llama a updatePersonList cuando se hace clic en el botón "Personas Registradas"
document.getElementById('llamarpersonas').addEventListener('click', function() {
    updatePersonList();
});


// Función para actualizar la lista de relaciones en la tabla
function updateRelationshipList() {
    const session = window.neo4jSession;
    session.writeTransaction(tx => {
        return tx.run('MATCH (a:Person)-[r:RELATIONSHIP]->(b:Person) RETURN a, r, b');
    })
    .then(result => {
        const relationshipsTableBody = document.querySelector('#relationships-table tbody');
        relationshipsTableBody.innerHTML = ''; // Limpiar la tabla antes de agregar nuevas filas
        result.records.forEach(record => {
            const person1 = record.get('a').properties;
            const relationship = record.get('r').properties;
            const person2 = record.get('b').properties;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${person1.name}</td>
                <td>${person2.name}</td>
                <td>${relationship.type}</td>
                <td>${relationship.frequency}</td>
                <td>${relationship.importance}</td>
                <td><button class="delete-btn" data-person1="${person1.name}" data-person2="${person2.name}" data-type="${relationship.type}">Eliminar</button></td>
            `;
            relationshipsTableBody.appendChild(row);
        });

        // Añadir eventos de clic a los botones de eliminar
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const person1 = this.getAttribute('data-person1');
                const person2 = this.getAttribute('data-person2');
                const type = this.getAttribute('data-type');
                deleteRelationship(person1, person2, type);
            });
        });
    })
    .catch(error => {
        console.error('Error al obtener lista de relaciones:', error);
    });
}

// Función para eliminar una relación
function deleteRelationship(person1, person2, type) {
    const session = window.neo4jSession;
    session.writeTransaction(tx => {
        return tx.run(
            'MATCH (a:Person {name: $person1})-[r:RELATIONSHIP {type: $type}]->(b:Person {name: $person2}) DELETE r',
            { person1: person1, person2: person2, type: type }
        );
    })
    .then(result => {
        console.log('Relación eliminada:', result);
        updateRelationshipList();
    })
    .catch(error => {
        console.error('Error al eliminar relación:', error);
    });
}

// Llama a updateRelationshipList cuando se hace clic en el botón "Relaciones Registradas"
document.getElementById("llamarrelaciones").addEventListener('click', function() {
    updateRelationshipList();
});




// Función para cargar las opciones en todos los selectores de personas
function loadPersonOptions() {
    const session = window.neo4jSession;
    session.readTransaction(tx => {
        return tx.run('MATCH (p:Person) RETURN p')
        .then(result => {
            // Selectores para el formulario de relaciones
            const person1Select = document.getElementById('person1');
            const person2Select = document.getElementById('person2');

            // Selectores para el formulario de consulta de relaciones
            const person1QuerySelect = document.getElementById('person1-query-select');
            const person2QuerySelect = document.getElementById('person2-query-select');

            // Limpia los selectores antes de agregar nuevas opciones
            if (person1Select) person1Select.innerHTML = '<option value="">Seleccione una persona</option>';
            if (person2Select) person2Select.innerHTML = '<option value="">Seleccione una persona</option>';
            if (person1QuerySelect) person1QuerySelect.innerHTML = '<option value="">Seleccione una persona</option>';
            if (person2QuerySelect) person2QuerySelect.innerHTML = '<option value="">Seleccione una persona</option>';

            // Añade opciones a los selectores
            result.records.forEach(record => {
                const person = record.get('p').properties;
                const option1 = document.createElement('option');
                const option2 = document.createElement('option');
                const optionQuery1 = document.createElement('option');
                const optionQuery2 = document.createElement('option');
                option1.value = person.name;
                option1.textContent = `${person.name} (${person.nickname})`;
                option2.value = person.name;
                option2.textContent = `${person.name} (${person.nickname})`;
                optionQuery1.value = person.name;
                optionQuery1.textContent = `${person.name} (${person.nickname})`;
                optionQuery2.value = person.name;
                optionQuery2.textContent = `${person.name} (${person.nickname})`;

                // Añadir opciones a los selectores si existen
                if (person1Select) person1Select.appendChild(option1);
                if (person2Select) person2Select.appendChild(option2);
                if (person1QuerySelect) person1QuerySelect.appendChild(optionQuery1);
                if (person2QuerySelect) person2QuerySelect.appendChild(optionQuery2);
            });
        })
        .catch(error => {
            console.error('Error al cargar opciones de personas:', error);
        });
    });
}


// Llamar a loadPersonOptions al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadPersonOptions();
});



// Función para manejar la consulta de relaciones
// Función para manejar la consulta de relaciones
document.getElementById('relationship-query-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const person1 = document.getElementById('person1-query-select').value;
    const person2 = document.getElementById('person2-query-select').value;
    const type = document.getElementById('relationship-type-query').value;

    if (person1 && person2) {
        // Consulta para encontrar personas en común entre dos personas
        const session = window.neo4jSession;
        let query = 'MATCH (p1:Person {name: $person1})-[r1:RELATIONSHIP]->(c:Person)<-[r2:RELATIONSHIP]-(p2:Person {name: $person2})';
        let params = {
            person1: person1,
            person2: person2,
        };
        if (type) {
            query += ' WHERE r1.type = $type AND r2.type = $type';
            params.type = type;
        }
        query += ' RETURN c';

        session.run(query, params)
        .then(result => {
            const queryResult = document.getElementById('query-result');
            queryResult.innerHTML = '';
            if (result.records.length > 0) {
                result.records.forEach(record => {
                    const commonPerson = record.get('c').properties;
                    queryResult.innerHTML += `<p>${commonPerson.name} (${commonPerson.nickname})</p>`;
                });
            } else {
                queryResult.innerHTML = '<p>No se encontraron personas en común.</p>';
            }
        })
        .catch(error => {
            console.error('Error al realizar la consulta:', error);
        });
    } else if (person1) {
        // Consulta para encontrar relaciones de una persona
        const session = window.neo4jSession;
        let query = 'MATCH (p:Person {name: $person1})-[r:RELATIONSHIP]->(c:Person)';
        let params = { person1: person1 };
        if (type) {
            query += ' WHERE r.type = $type';
            params.type = type;
        }
        query += ' RETURN c';

        session.run(query, params)
        .then(result => {
            const queryResult = document.getElementById('query-result');
            queryResult.innerHTML = '';
            if (result.records.length > 0) {
                result.records.forEach(record => {
                    const relatedPerson = record.get('c').properties;
                    queryResult.innerHTML += `<p>${relatedPerson.name} (${relatedPerson.nickname})</p>`;
                });
            } else {
                queryResult.innerHTML = '<p>No se encontraron relaciones.</p>';
            }
        })
        .catch(error => {
            console.error('Error al realizar la consulta:', error);
        });
    } else {
        alert('Por favor, seleccione al menos una persona para realizar la consulta.');
    }
});


// Función para mostrar las personas con más relaciones
document.getElementById('show-relations').addEventListener('click', function() {
    const session = window.neo4jSession;
    session.run(
        'MATCH (p:Person)-[r:RELATIONSHIP]->() ' +
        'RETURN p, COUNT(r) AS numRelations ' +
        'ORDER BY numRelations DESC'
    )
    .then(result => {
        const mostRelationsTableBody = document.querySelector('#most-relations-table tbody');
        mostRelationsTableBody.innerHTML = ''; // Limpiar la tabla antes de agregar nuevas filas
        result.records.forEach(record => {
            const person = record.get('p').properties;
            const numRelations = record.get('numRelations').low; // Ajuste según la versión de neo4j-driver que uses
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${person.name}</td>
                <td>${numRelations}</td>
            `;
            mostRelationsTableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error al obtener lista de relaciones:', error);
    });
});



// Funcionalidad de los acordeones
const accordions = document.getElementsByClassName('accordion');
for (let i = 0; i < accordions.length; i++) {
    accordions[i].addEventListener('click', function() {
        this.classList.toggle('active');
        const panel = this.nextElementSibling;
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'block';
        }
    });
}


