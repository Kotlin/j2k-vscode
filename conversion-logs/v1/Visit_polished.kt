// 2025-07-22T08:48:38.227Z (logged at)

package org.springframework.samples.petclinic.owner

import java.time.LocalDate

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.samples.petclinic.model.BaseEntity;

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank

@Entity
@Table(name = "visits")
data class Visit(
    @get:Column(name = "visit_date")
    @set:DateTimeFormat(pattern = "yyyy-MM-dd")
    var date: LocalDate,

    @get:NotBlank
    var description: String
) : BaseEntity() {

    constructor() : this(LocalDate.now(), "")
}
