import React from 'react'

const Books = (props) => {

  if (!props.show) {
    return null
  }

  const { result, genres } = props;

  if ( result.loading ) {
    return <div>loading..</div>
  }
 
  const books = result.data.allBooks

  return (
    <div>
      <h2>books</h2>
      <div className="filters">
        
        { genres.map(g => {
          return (
            <button key={g} onClick={() => props.handleGenreSelect(g)}>{g}</button>
          )
        })}
        <button onClick={() => props.handleGenreSelect()}>show all</button>
      </div>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              author
            </th>
            <th>
              published
            </th>
          </tr>
          {books.map(a =>
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Books