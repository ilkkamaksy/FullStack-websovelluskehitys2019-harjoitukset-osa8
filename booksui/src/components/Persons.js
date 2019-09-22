import React, { useState } from 'react'
import { gql } from 'apollo-boost'

const FIND_PERSON = gql`
    query findPersonByName($nameToSearch: String!) {
        findPerson(name: $nameToSearch) {
            name
            phone
            id
            address {
                street
                city
            }
        }
    }
`
const Persons = ({ result, client }) => {

    const [person, setPerson] = useState(null)

    if ( result.loading ) {
        return <div>loading..</div>
    }

    const showPerson = async (name) => {
        const { data } = await client.query({
            query: FIND_PERSON,
            variables: { nameToSearch: name }
        })
        setPerson(data.findPerson)
    }

    if ( person ) {
        return (
            <div>
                <h2>{person.name}</h2>
                <div>{person.address.street} {person.address.city}</div>
                <div>{person.phone}</div>
                <button onClick={() => setPerson(null)}>close</button>
            </div>
        )
    }

    const persons = result.data.allPersons

    return (
        <div>
            <h1>People</h1>
            {persons.map(p => 
                <div key={p.name}>
                    {p.name} {p.phone}
                    <button onClick={() => showPerson(p.name)} >
                        show address
                    </button> 
                </div>
                )}
        </div>
    )
}

export default Persons