import React from 'react'

const Recommendations = (props) => {

    if (!props.show) {
        return null
    }

    const { result, user } = props

    if ( result.loading ) {
        return <div>loading..</div>
    }

    const books = result.data.allBooks.filter(b => b.genres.includes(user.data.me.favoriteGenre))

    return (
        <div>
            <div><p>books in you favorite genre <strong>{user.data.me.favoriteGenre}</strong></p></div>
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

export default Recommendations