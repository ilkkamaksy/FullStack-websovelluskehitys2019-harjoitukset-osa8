import React, { useState } from 'react'
import Select from 'react-select';

const EditAuthor = (props) => {
  const [name, setName] = useState(null)
  const [born, setBorn] = useState('')

  if (!props.show) {
    return null
  }

  const authors = props.result.data.allAuthors.map(a => { 
      return { 
          value: a.name, 
          label: a.name 
        }
    })

  const submit = async (e) => {
    e.preventDefault()

    await props.editAuthor({
      variables: { name: name.value, born }
    })

    setName(null)
    setBorn('')
  }

    const handleChange = selectedOption => {
        setName(selectedOption)
    }
      
  return (
    <div>
        <h2>Set birthyear</h2>
      <form onSubmit={submit}>
        <div>
          name
          <Select 
            value={name}
            onChange={handleChange}
            options={authors} 
            />
        </div>
        <div>
          born
          <input
            type='number'
            value={born}
            onChange={({ target }) => setBorn(parseInt(target.value))}
          />
        </div>
        <button type='submit'>Edit author</button>
      </form>
    </div>
  )
}

export default EditAuthor