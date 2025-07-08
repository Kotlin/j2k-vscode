export function convertToKotlin(javaCode: string) {
  // TODO: convert using REST API

  // return 'fun main() {\n  println("Hello World")\n}';

  return `package com.devtiro.database.controllers

import com.devtiro.database.domain.dto.AuthorDto
import com.devtiro.database.domain.entities.AuthorEntity
import com.devtiro.database.mappers.Mapper
import com.devtiro.database.services.AuthorService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.stream.Collectors

@RestController
class AuthorController(
    private val authorService: AuthorService,
    private val authorMapper: Mapper<AuthorEntity, AuthorDto>
) {
    @PostMapping(path = ["/authors"])
    fun createAuthor(@RequestBody author: AuthorDto): ResponseEntity<AuthorDto?> {
        val authorEntity = authorMapper.mapFrom(author)
        val savedAuthorEntity = authorService.save(authorEntity)
        return ResponseEntity(authorMapper.mapTo(savedAuthorEntity), HttpStatus.CREATED)
    }

    @GetMapping(path = ["/authors"])
    fun listAuthors(): List<AuthorDto?> {
        val authors = authorService.findAll()
        return authors!!.stream()
            .map { a: AuthorEntity? ->
                authorMapper.mapTo(
                    a!!
                )
            }
            .collect(Collectors.toList())
    }

    @GetMapping(path = ["/authors/{id}"])
    fun getAuthor(@PathVariable("id") id: Long): ResponseEntity<AuthorDto?> {
        return authorService.findOne(id)?.let { authorEntity: AuthorEntity? ->
            val authorDto = authorMapper.mapTo(authorEntity!!)
            ResponseEntity(authorDto, HttpStatus.OK)
        } ?: ResponseEntity(HttpStatus.NOT_FOUND)
    }

    @PutMapping(path = ["/authors/{id}"])
    fun fullUpdateAuthor(
        @PathVariable("id") id: Long,
        @RequestBody authorDto: AuthorDto
    ): ResponseEntity<AuthorDto?> {
        if (!authorService.isExists(id)) {
            return ResponseEntity(HttpStatus.NOT_FOUND)
        }

        authorDto.id = id
        val authorEntity = authorMapper.mapFrom(authorDto)
        val savedAuthorEntity = authorService.save(authorEntity)
        return ResponseEntity(
            authorMapper.mapTo(savedAuthorEntity!!),
            HttpStatus.OK
        )
    }

    @PatchMapping(path = ["/authors/{id}"])
    fun partialUpdate(
        @PathVariable("id") id: Long,
        @RequestBody authorDto: AuthorDto?
    ): ResponseEntity<AuthorDto?> {
        if (!authorService.isExists(id)) {
            return ResponseEntity(HttpStatus.NOT_FOUND)
        }

        val authorEntity = authorMapper.mapFrom(authorDto!!)
        val updatedAuthor = authorService.partialUpdate(id, authorEntity)
        return ResponseEntity(
            authorMapper.mapTo(updatedAuthor!!),
            HttpStatus.OK
        )
    }

    @DeleteMapping(path = ["/authors/{id}"])
    fun deleteAuthor(@PathVariable("id") id: Long): ResponseEntity<*> {
        authorService.delete(id)
        return ResponseEntity<Any?>(HttpStatus.NO_CONTENT)
    }
}
`;
}
